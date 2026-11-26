using System.ComponentModel.DataAnnotations;

namespace ClaimsApi.Models;

public class CreateClaimRequest
{
    [Range(1, int.MaxValue)]
    public int ClaimantId { get; set; }

    [Required]
    public string ClaimType { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal ClaimAmount { get; set; }
}

public class AssignClaimRequest
{
    [Range(1, int.MaxValue)]
    public int StaffId { get; set; }
}

public class DecideClaimRequest
{
    public bool Approved { get; set; }
    public string? DecisionNotes { get; set; }
}
