using ClaimsApi.Data;
using ClaimsApi.Models;
using ClaimsApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClaimsApi.Controllers;

[ApiController]
[Route("api")]
public class ClaimsController(
    ClaimsDbContext dbContext,
    KafkaProducerService kafkaProducerService) : ControllerBase
{
    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups(CancellationToken cancellationToken)
    {
        var claimants = await dbContext.Claimants.AsNoTracking().OrderBy(row => row.Id).ToListAsync(cancellationToken);
        var staff = await dbContext.ClaimsStaff.AsNoTracking().OrderBy(row => row.Id).ToListAsync(cancellationToken);
        return Ok(new { claimants, staff });
    }

    [HttpGet("claims")]
    public async Task<IActionResult> GetClaims(CancellationToken cancellationToken)
    {
        var claims = await dbContext.Claims
            .AsNoTracking()
            .Include(claim => claim.Claimant)
            .Include(claim => claim.AssignedStaff)
            .OrderByDescending(claim => claim.CreatedAt)
            .ToListAsync(cancellationToken);
        return Ok(claims);
    }

    [HttpPost("claims")]
    public async Task<IActionResult> CreateClaim(CreateClaimRequest request, CancellationToken cancellationToken)
    {
        var claimantExists = await dbContext.Claimants.AnyAsync(row => row.Id == request.ClaimantId, cancellationToken);
        if (!claimantExists)
        {
            return BadRequest(new { message = "The specified claimant does not exist." });
        }

        var claim = new Claim
        {
            ClaimantId = request.ClaimantId,
            ClaimType = request.ClaimType,
            Description = request.Description,
            ClaimAmount = request.ClaimAmount,
            Status = ClaimStatus.Submitted,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Claims.Add(claim);
        await dbContext.SaveChangesAsync(cancellationToken);

        await kafkaProducerService.PublishAsync(new ClaimEvent
        {
            EventType = "ClaimSubmitted",
            ClaimId = claim.Id,
            ClaimantId = claim.ClaimantId,
            ClaimAmount = claim.ClaimAmount,
            Status = claim.Status.ToString()
        }, cancellationToken);

        return CreatedAtAction(nameof(GetClaims), new { }, claim);
    }

    [HttpPatch("claims/{id:int}/assign")]
    public async Task<IActionResult> AssignClaim(int id, AssignClaimRequest request, CancellationToken cancellationToken)
    {
        var claim = await dbContext.Claims.SingleOrDefaultAsync(row => row.Id == id, cancellationToken);
        if (claim is null)
        {
            return NotFound();
        }

        if (claim.Status != ClaimStatus.Submitted)
        {
            return Conflict(new { message = "Only submitted claims can be assigned." });
        }

        var staffExists = await dbContext.ClaimsStaff.AnyAsync(row => row.Id == request.StaffId, cancellationToken);
        if (!staffExists)
        {
            return BadRequest(new { message = "The specified staff member does not exist." });
        }

        claim.AssignedStaffId = request.StaffId;
        claim.Status = ClaimStatus.Assigned;
        await dbContext.SaveChangesAsync(cancellationToken);

        await kafkaProducerService.PublishAsync(new ClaimEvent
        {
            EventType = "ClaimAssigned",
            ClaimId = claim.Id,
            ClaimantId = claim.ClaimantId,
            StaffId = claim.AssignedStaffId,
            ClaimAmount = claim.ClaimAmount,
            Status = claim.Status.ToString()
        }, cancellationToken);

        return Ok(claim);
    }

    [HttpPatch("claims/{id:int}/decision")]
    public async Task<IActionResult> DecideClaim(int id, DecideClaimRequest request, CancellationToken cancellationToken)
    {
        var claim = await dbContext.Claims.SingleOrDefaultAsync(row => row.Id == id, cancellationToken);
        if (claim is null)
        {
            return NotFound();
        }

        if (claim.Status != ClaimStatus.Assigned)
        {
            return Conflict(new { message = "Only assigned claims can receive a decision." });
        }

        claim.Status = request.Approved ? ClaimStatus.Approved : ClaimStatus.Rejected;
        claim.DecisionNotes = request.DecisionNotes;
        await dbContext.SaveChangesAsync(cancellationToken);

        await kafkaProducerService.PublishAsync(new ClaimEvent
        {
            EventType = "ClaimSettled",
            ClaimId = claim.Id,
            ClaimantId = claim.ClaimantId,
            StaffId = claim.AssignedStaffId,
            ClaimAmount = claim.ClaimAmount,
            Status = claim.Status.ToString(),
            DecisionNotes = claim.DecisionNotes
        }, cancellationToken);

        return Ok(claim);
    }

    [HttpGet("metrics")]
    public async Task<IActionResult> GetMetrics(CancellationToken cancellationToken)
    {
        var metrics = await dbContext.ManagerMetrics
            .AsNoTracking()
            .SingleOrDefaultAsync(row => row.Id == 1, cancellationToken);
        return metrics is null ? NotFound() : Ok(metrics);
    }
}
