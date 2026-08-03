using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities;

public class AuditLog : BaseEntity
{
    public Guid BranchId { get; private set; }
    public Branch Branch { get; private set; } = default!;

    public string ActorName { get; private set; } = string.Empty;
    public AuditLogCategory Category { get; private set; }
    public AuditLogSeverity Severity { get; private set; }
    public string Action { get; private set; } = string.Empty;
    public string Message { get; private set; } = string.Empty;
    public string? EntityType { get; private set; }
    public Guid? EntityId { get; private set; }
    public string? Metadata { get; private set; }

    protected AuditLog() { }

    public static AuditLog Create(
        Guid branchId,
        string actorName,
        AuditLogCategory category,
        AuditLogSeverity severity,
        string action,
        string message,
        string? entityType = null,
        Guid? entityId = null,
        string? metadata = null)
    {
        if (branchId == Guid.Empty)
            throw new DomainException("Geçersiz şube ID'si.");

        if (string.IsNullOrWhiteSpace(actorName))
            throw new DomainException("İşlemi yapan kişi boş olamaz.");

        if (string.IsNullOrWhiteSpace(action))
            throw new DomainException("Action boş olamaz.");

        if (string.IsNullOrWhiteSpace(message))
            throw new DomainException("Mesaj boş olamaz.");

        return new AuditLog
        {
            BranchId = branchId,
            ActorName = actorName,
            Category = category,
            Severity = severity,
            Action = action,
            Message = message,
            EntityType = entityType,
            EntityId = entityId,
            Metadata = metadata
        };
    }
}
