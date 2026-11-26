namespace ClaimsApi.Models;

public class Claim
{
    public int Id { get; set; }
    public int ClaimantId { get; set; }
    public int? AssignedStaffId { get; set; }
    public string ClaimType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal ClaimAmount { get; set; }
    public ClaimStatus Status { get; set; }
    public string? DecisionNotes { get; set; }
    public DateTime CreatedAt { get; set; }

    public Claimant Claimant { get; set; } = null!;
    public ClaimsStaff? AssignedStaff { get; set; }
}

public enum ClaimStatus
{
    Submitted,
    Assigned,
    Approved,
    Rejected
}
