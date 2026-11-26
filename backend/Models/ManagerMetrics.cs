namespace ClaimsApi.Models;

public class ManagerMetrics
{
    public int Id { get; set; }
    public decimal PendingExposureAmount { get; set; }
    public decimal ApprovedLiabilityAmount { get; set; }
    public int OpenClaimsCount { get; set; }
    public int TotalClaimsCount { get; set; }
    public DateTime LastUpdatedAt { get; set; }
}
