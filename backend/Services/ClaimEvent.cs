namespace ClaimsApi.Services;

public class ClaimEvent
{
    public Guid EventId { get; set; } = Guid.NewGuid();
    public string EventType { get; set; } = string.Empty;
    public int ClaimId { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public int? ClaimantId { get; set; }
    public int? StaffId { get; set; }
    public decimal? ClaimAmount { get; set; }
    public string? Status { get; set; }
    public string? DecisionNotes { get; set; }
}
