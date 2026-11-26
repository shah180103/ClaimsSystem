using ClaimsApi.Models;
using Microsoft.EntityFrameworkCore;

namespace ClaimsApi.Data;

public class ClaimsDbContext(DbContextOptions<ClaimsDbContext> options) : DbContext(options)
{
    public DbSet<Claimant> Claimants => Set<Claimant>();
    public DbSet<ClaimsStaff> ClaimsStaff => Set<ClaimsStaff>();
    public DbSet<Claim> Claims => Set<Claim>();
    public DbSet<ManagerMetrics> ManagerMetrics => Set<ManagerMetrics>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Claim>()
            .HasOne(claim => claim.Claimant)
            .WithMany()
            .HasForeignKey(claim => claim.ClaimantId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Claim>()
            .HasOne(claim => claim.AssignedStaff)
            .WithMany()
            .HasForeignKey(claim => claim.AssignedStaffId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ManagerMetrics>()
            .ToTable(table => table.HasCheckConstraint("CK_ManagerMetrics_SingletonId", "\"Id\" = 1"));
    }

    public static async Task SeedAsync(ClaimsDbContext dbContext, CancellationToken cancellationToken = default)
    {
        if (!await dbContext.Claimants.AnyAsync(cancellationToken))
        {
            dbContext.Claimants.AddRange(
                new Claimant { Id = 1, FullName = "Avery Morgan", PolicyNumber = "POL-1001", Email = "avery.morgan@example.com" },
                new Claimant { Id = 2, FullName = "Jordan Taylor", PolicyNumber = "POL-1002", Email = "jordan.taylor@example.com" });
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        if (!await dbContext.ClaimsStaff.AnyAsync(cancellationToken))
        {
            dbContext.ClaimsStaff.AddRange(
                new ClaimsStaff { Id = 1, FullName = "Casey Reed", Specialization = "Property" },
                new ClaimsStaff { Id = 2, FullName = "Riley Chen", Specialization = "Auto" });
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        if (!await dbContext.Claims.AnyAsync(cancellationToken))
        {
            var now = DateTime.UtcNow;
            dbContext.Claims.AddRange(
                new Claim
                {
                    Id = 1,
                    ClaimantId = 1,
                    AssignedStaffId = 1,
                    ClaimType = "Property",
                    Description = "Water damage to the kitchen",
                    ClaimAmount = 1250m,
                    Status = ClaimStatus.Approved,
                    DecisionNotes = "Repair estimate approved",
                    CreatedAt = now.AddDays(-3)
                },
                new Claim
                {
                    Id = 2,
                    ClaimantId = 2,
                    AssignedStaffId = 2,
                    ClaimType = "Auto",
                    Description = "Rear bumper damage",
                    ClaimAmount = 2400m,
                    Status = ClaimStatus.Assigned,
                    CreatedAt = now.AddDays(-2)
                },
                new Claim
                {
                    Id = 3,
                    ClaimantId = 1,
                    ClaimType = "Property",
                    Description = "Theft of personal electronics",
                    ClaimAmount = 800m,
                    Status = ClaimStatus.Submitted,
                    CreatedAt = now.AddDays(-1)
                });
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        await MetricsCalculator.RecalculateAsync(dbContext, cancellationToken);
    }
}
