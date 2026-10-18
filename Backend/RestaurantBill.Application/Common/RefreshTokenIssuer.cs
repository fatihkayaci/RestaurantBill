using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Common;

public static class RefreshTokenIssuer
{
    // Token'ı context'e ekler, SaveChanges çağıranın sorumluluğunda. Ham token yalnızca cookie'ye yazılmak üzere döner.
    public static (string RawToken, DateTime ExpiresAt) Issue(
        IAppDbContext db, RefreshTokenSettings settings, Guid userId, Guid branchId, UserRole role, bool rememberMe)
    {
        DateTime absoluteExpiresAt = DateTime.UtcNow.Add(settings.LifetimeFor(rememberMe));
        string rawToken = RefreshTokenHasher.GenerateRawToken();
        string tokenHash = RefreshTokenHasher.Hash(rawToken);

        RefreshToken refreshToken = RefreshToken.Create(
            userId, branchId, role, tokenHash, absoluteExpiresAt, absoluteExpiresAt, rememberMe, null, null);

        db.RefreshTokens.Add(refreshToken);

        return (rawToken, absoluteExpiresAt);
    }
}
