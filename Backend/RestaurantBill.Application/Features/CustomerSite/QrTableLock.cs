using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.CustomerSite;

/// <summary>Masa QR'ında bu telefonun durumu: masa kimseye bağlı değil, bu telefona bağlı ya da başka telefona bağlı.</summary>
public enum QrLockState
{
    None,
    Mine,
    Other
}

// Masa QR'ının "masa sahibi telefon" kuralı. Telefon kendi ürettiği rastgele cihaz anahtarını (X-Device-Token) gönderir;
// sunucu yalnızca SHA-256 özetini saklar ve karşılaştırır, anahtarın kendisi saklanmaz ve loglanmaz.
//
// Masanın sahibi:
//   1. Masada açık hesap varsa hesabın QrOwnerTokenHash'i (hesaba bağlıdır: ödenince/iptal edilince kendiliğinden düşer,
//      masa taşımada siparişle birlikte gider).
//   2. Hesap yoksa (ya da hesap kimseye bağlı değilse) masadaki en eski bekleyen QR talebinin telefonu. Garson bütün
//      talepleri reddederse ve açık hesap yoksa kilit kendiliğinden kalkar.
// QR'ı okutmak (sayfayı açmak) kilitlemez; ilk sipariş talebini gönderen telefon sahip olur.
public static class QrTableLock
{
    public const string HeaderName = "X-Device-Token";
    public const int MinTokenLength = 16;
    public const int MaxTokenLength = 128;

    public const string OtherDeviceMessage = "Bu masanın siparişleri başka bir telefondan veriliyor. Siparişinizi garsonumuza verebilirsiniz.";
    public const string MissingTokenMessage = "Sayfayı yenileyip tekrar deneyin.";
    public const string NotOwnerMessage = "Masanın hesabı yalnızca bu masadan sipariş veren telefonda görünür.";

    /// <summary>Geçerli biçimdeki anahtarın özeti (64 hex); anahtar yoksa ya da biçimi bozuksa null.</summary>
    public static string? HashToken(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return null;

        string trimmed = token.Trim();
        if (trimmed.Length is < MinTokenLength or > MaxTokenLength || trimmed.Any(c => !(char.IsAsciiLetterOrDigit(c) || c == '-')))
            return null;

        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(trimmed)));
    }

    /// <summary>Masanın ödenmemiş, iptal edilmemiş son hesabı.</summary>
    public static Task<Order?> FindOpenOrderAsync(IAppDbContext db, Guid tableId, bool track, CancellationToken cancellationToken)
    {
        IQueryable<Order> query = track ? db.Orders : db.Orders.AsNoTracking();
        return query
            .Where(o => o.TableId == tableId && o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    /// <summary>Masanın sahibi telefonun özeti; masa kimseye bağlı değilse null.</summary>
    public static async Task<string?> OwnerHashAsync(IAppDbContext db, Guid tableId, Order? openOrder, CancellationToken cancellationToken)
    {
        if (openOrder?.QrOwnerTokenHash is { } orderOwner)
            return orderOwner;

        return await db.OrderRequests.AsNoTracking()
            .Where(r => r.TableId == tableId && r.Kind == OrderRequestKind.TableQr && r.Status == OrderRequestStatus.Pending && r.DeviceTokenHash != null)
            .OrderBy(r => r.CreatedAt)
            .Select(r => r.DeviceTokenHash)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public static QrLockState StateOf(string? ownerHash, string? tokenHash)
        => ownerHash is null ? QrLockState.None
            : tokenHash is not null && CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(ownerHash), Encoding.ASCII.GetBytes(tokenHash))
                ? QrLockState.Mine
                : QrLockState.Other;

    public static async Task<QrLockState> StateAsync(IAppDbContext db, Guid tableId, string? tokenHash, CancellationToken cancellationToken)
    {
        Order? openOrder = await FindOpenOrderAsync(db, tableId, track: false, cancellationToken);
        return StateOf(await OwnerHashAsync(db, tableId, openOrder, cancellationToken), tokenHash);
    }

    /// <summary>"none" / "mine" / "other" (müşteri sayfasının beklediği biçim).</summary>
    public static string ToWire(QrLockState state) => state switch
    {
        QrLockState.Mine => "mine",
        QrLockState.Other => "other",
        _ => "none"
    };
}
