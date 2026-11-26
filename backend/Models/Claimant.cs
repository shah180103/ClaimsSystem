namespace ClaimsApi.Models;

public class Claimant
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string PolicyNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}
