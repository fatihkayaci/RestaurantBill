using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.CustomerSite.Public;

/// <summary>
/// Masa QR menüsünün "Popüler" bölümü: şubenin son <see cref="WindowDays"/> günde en çok satılan ürünleri.
/// Kaynak ödeme kalemleri (PaymentLineItem): ödenen sipariş kalemi siparişten silindiği için satış raporları da bunu okur;
/// ödeme anında dondurulur, iptal edilen/ödenmeyen kalemler sayılmaz. Menü (set) satırları sayılmaz, yalnız ürünler.
/// Bugün menüde olmayan (pasif/silinmiş) ya da tükenmiş ürünler listeye girmez. <see cref="MinProducts"/>'tan az ürün
/// kalırsa liste boştur: bölüm gösterilmez. Sonuç şube başına <see cref="CacheDuration"/> önbellekte tutulur.
/// </summary>
public static class PopularProducts
{
    public const int WindowDays = 30;
    public const int MaxProducts = 8;
    public const int MinProducts = 3;
    public static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(15);

    public static string CacheKey(Guid branchId) => $"qr-popular:{branchId}";

    /// <summary>Önbellekten ya da veritabanından; boş liste de önbelleğe girer (az satışlı şubede her açılışta sorgu yok).</summary>
    public static async Task<List<Guid>> GetAsync(IAppDbContext db, IMemoryCache cache, Guid branchId, DateTime nowUtc, CancellationToken cancellationToken)
    {
        if (cache.TryGetValue(CacheKey(branchId), out List<Guid>? cached) && cached is not null)
            return [.. cached];

        List<Guid> ids = await ComputeAsync(db, branchId, nowUtc, cancellationToken);
        cache.Set(CacheKey(branchId), ids, CacheDuration);
        return [.. ids];
    }

    public static async Task<List<Guid>> ComputeAsync(IAppDbContext db, Guid branchId, DateTime nowUtc, CancellationToken cancellationToken)
    {
        DateTime since = nowUtc.AddDays(-WindowDays);

        var sold = await db.PaymentLineItems.AsNoTracking()
            .Where(l => l.ProductId != null
                && l.Payment.CashRegister.BranchId == branchId
                && l.Payment.CreatedAt >= since)
            .GroupBy(l => l.ProductId!.Value)
            .Select(g => new { ProductId = g.Key, Quantity = g.Sum(l => l.Quantity) })
            .ToListAsync(cancellationToken);
        if (sold.Count < MinProducts) return [];

        List<Guid> soldIds = sold.Select(s => s.ProductId).ToList();
        var listed = await db.Products.AsNoTracking()
            .Where(p => soldIds.Contains(p.Id) && p.Category.BranchId == branchId && p.IsActive && !p.IsOutOfStock)
            .Select(p => new { p.Id, p.Name })
            .ToListAsync(cancellationToken);

        List<Guid> ranked = listed
            .Join(sold, p => p.Id, s => s.ProductId, (p, s) => new { p.Id, p.Name, s.Quantity })
            .OrderByDescending(x => x.Quantity)
            .ThenBy(x => x.Name, StringComparer.Create(new System.Globalization.CultureInfo("tr-TR"), ignoreCase: true))
            .Take(MaxProducts)
            .Select(x => x.Id)
            .ToList();
        return ranked.Count < MinProducts ? [] : ranked;
    }
}
