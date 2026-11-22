using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.CustomerSite;

// Masa QR'ının ortak kuralları. Masada QR'ı açan her telefon sipariş verebilir (garson onayıyla) ve açık hesabı görür;
// personel masada QR'dan siparişi kilitleyebilir (Table.QrOrderingLocked).
//
// Telefon kendi ürettiği rastgele cihaz anahtarını (X-Device-Token) gönderir; sunucu yalnızca SHA-256 özetini saklar
// (OrderRequest.DeviceTokenHash), anahtarın kendisi saklanmaz ve loglanmaz. Özet iki işe yarar: telefon kendi
// taleplerini tanır, ve hesap ödendikten sonra "Ödendi" fişi yalnız o hesaba talebi yazılan telefonlarda görünür
// (sonraki misafirlere önceki masanın hesabı gösterilmez).
public static class QrTableAccess
{
    public const string HeaderName = "X-Device-Token";
    public const int MinTokenLength = 16;
    public const int MaxTokenLength = 128;

    public const string MissingTokenMessage = "Sayfayı yenileyip tekrar deneyin.";
    public const string OrderingLockedMessage = "Bu masada QR ile sipariş şu an kapalı. Siparişinizi garsonumuza verebilirsiniz.";

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
}
