using ClaimsApi.Models;
using Microsoft.EntityFrameworkCore;

namespace ClaimsApi.Data;

public static class MetricsCalculator
{
    public static async Task RecalculateAsync(ClaimsDbContext dbContext, CancellationToken cancellationToken = default)
    {
        var claims = await dbContext.Claims
            .AsNoTracking()
            .Select(claim => new { claim.ClaimAmount, claim.Status })
            .ToListAsync(cancellationToken);

        var metrics = await dbContext.ManagerMetrics
            .SingleOrDefaultAsync(row => row.Id == 1, cancellationToken);

        if (metrics is null)
        {
            metrics = new ManagerMetrics { Id = 1 };
            dbContext.ManagerMetrics.Add(metrics);
        }

        metrics.PendingExposureAmount = claims
            .Where(claim => claim.Status is ClaimStatus.Submitted or ClaimStatus.Assigned)
            .Sum(claim => claim.ClaimAmount);
        metrics.ApprovedLiabilityAmount = claims
            .Where(claim => claim.Status == ClaimStatus.Approved)
            .Sum(claim => claim.ClaimAmount);
        metrics.OpenClaimsCount = claims.Count(claim => claim.Status is ClaimStatus.Submitted or ClaimStatus.Assigned);
        metrics.TotalClaimsCount = claims.Count;
        metrics.LastUpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
