using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Features.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.Categories;

// Kategori servis penceresinin (Category.IsAvailableAt) şube saat dilimiyle değerlendirilmesi ve müşteri siparişinde
// (QR talebi, online paket) gönderim anındaki kontrolü. Garson/kasa ekleyebilir; yalnız uyarı görür.
public static class CategoryAvailability
{
    /// <summary>Fiyatlanmış sepetin kategori kontrolüne girecek kalemleri: ürünün kategorisi; menüde menünün kendi
    /// kategorisi ve seçilen her ürünün kategorisi.</summary>
    public static IEnumerable<(Guid CategoryId, string ItemName)> ItemsOf(IEnumerable<RestaurantBill.Application.Common.PricedLine> lines)
    {
        foreach (var line in lines)
        {
            if (line.Product is Product product)
            {
                yield return (product.CategoryId, product.Name);
                continue;
            }
            if (line.SetMenu is not SetMenu setMenu) continue;
            if (setMenu.CategoryId is Guid menuCategoryId)
                yield return (menuCategoryId, setMenu.Name);
            foreach (Guid productId in line.Selections.Values)
            {
                Product? chosen = setMenu.Slots.SelectMany(s => s.Options).Select(o => o.Product).FirstOrDefault(p => p.Id == productId);
                if (chosen is not null)
                    yield return (chosen.CategoryId, $"{setMenu.Name} ({chosen.Name})");
            }
        }
    }

    public static DateTime LocalNow(string timeZoneId, DateTime utcNow)
        => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utcNow, DateTimeKind.Utc), CustomerSiteScope.ZoneOf(timeZoneId));

    public static string UnavailableMessage(string itemName, Category category)
    {
        string label = category.AvailabilityLabel();
        return label.Length == 0
            ? $"{itemName} şu an servis edilmiyor. Sepetinizden çıkarıp tekrar gönderin."
            : $"{itemName} şu an servis edilmiyor ({category.Name}: {label}). Sepetinizden çıkarıp tekrar gönderin.";
    }

    /// <summary>
    /// Sepetteki ürünlerin ve menülerin (menünün kendi kategorisi ve seçilen ürünler) kategorileri şu an pencerenin
    /// içinde mi. Dışında kalan ilk kalem için Türkçe hata mesajı, hepsi uygunsa null döner.
    /// </summary>
    public static async Task<string?> FindUnavailableAsync(IAppDbContext db, Guid branchId,
        IEnumerable<(Guid CategoryId, string ItemName)> items, DateTime utcNow, CancellationToken cancellationToken)
    {
        List<(Guid CategoryId, string ItemName)> list = items.ToList();
        if (list.Count == 0) return null;

        List<Guid> categoryIds = list.Select(i => i.CategoryId).Distinct().ToList();
        List<Category> categories = await db.Categories.AsNoTracking()
            .Where(c => categoryIds.Contains(c.Id) && (c.AvailableDays != null || c.AvailableFrom != null || c.AvailableUntil != null))
            .ToListAsync(cancellationToken);
        if (categories.Count == 0) return null;

        string timeZoneId = await db.Branches.AsNoTracking()
            .Where(b => b.Id == branchId).Select(b => b.TimeZoneId).FirstOrDefaultAsync(cancellationToken) ?? "UTC";
        DateTime local = LocalNow(timeZoneId, utcNow);

        foreach ((Guid categoryId, string itemName) in list)
        {
            Category? category = categories.FirstOrDefault(c => c.Id == categoryId);
            if (category is not null && !category.IsAvailableAt(local))
                return UnavailableMessage(itemName, category);
        }
        return null;
    }
}
