using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities;

public class RefreshToken : BaseEntity
{
    public Guid UserId { get; private set; }
    public User User { get; private set; } = default!;

    // Owner girişinde Company.Id, çalışan girişinde Branch.Id — JWT'deki "RestaurantId" claim'iyle birebir aynı kaynaktan gelir.
    public Guid BranchId { get; private set; }
    public UserRole Role { get; private set; }
    public string TokenHash { get; private set; } = string.Empty;
    public DateTime ExpiresAt { get; private set; }
    public DateTime AbsoluteExpiresAt { get; private set; }
    public bool RememberMe { get; private set; }
    public DateTime? RevokedAt { get; private set; }
    public string? ReplacedByTokenHash { get; private set; }
    public string? CreatedByIp { get; private set; }
    public string? UserAgent { get; private set; }

    protected RefreshToken() { }

    public bool IsActive => RevokedAt is null && DateTime.UtcNow < ExpiresAt;

    public static RefreshToken Create(
        Guid userId,
        Guid branchId,
        UserRole role,
        string tokenHash,
        DateTime expiresAt,
        DateTime absoluteExpiresAt,
        bool rememberMe,
        string? createdByIp,
        string? userAgent)
    {
        if (userId == Guid.Empty)
            throw new DomainException("Geçersiz kullanıcı.");

        if (branchId == Guid.Empty)
            throw new DomainException("Geçersiz şube ID'si.");

        if (string.IsNullOrWhiteSpace(tokenHash))
            throw new DomainException("Token hash boş olamaz.");

        return new RefreshToken
        {
            UserId = userId,
            BranchId = branchId,
            Role = role,
            TokenHash = tokenHash,
            ExpiresAt = expiresAt,
            AbsoluteExpiresAt = absoluteExpiresAt,
            RememberMe = rememberMe,
            CreatedByIp = createdByIp,
            UserAgent = userAgent
        };
    }

    public void Revoke()
    {
        RevokedAt ??= DateTime.UtcNow;
    }

    public void ReplaceWith(string newTokenHash)
    {
        ReplacedByTokenHash = newTokenHash;
        Revoke();
    }
}
