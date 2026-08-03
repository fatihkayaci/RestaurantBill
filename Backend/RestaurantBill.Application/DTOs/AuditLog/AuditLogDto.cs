using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;
public class AuditLogDto
{
    public Guid Id { get; set; }
    public Guid BranchId { get; set; }
    public string? BranchName { get; set; }
    public string ActorName { get; set; } = string.Empty;
    public AuditLogCategory Category { get; set; }
    public AuditLogSeverity Severity { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public DateTime CreatedAt { get; set; }
}
