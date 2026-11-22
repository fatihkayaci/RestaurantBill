using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.SetMenus;

// Girişsiz uçların (online sipariş sayfası, restoran sitesi) paket menü listesi: şubenin aktif menüleri,
// müşteriye görünen alanlarla (maliyet, indirim ayrıntısı gibi yönetim alanları yok).
internal static class PublicSetMenus
{
    /// <param name="listedOnly">
    /// true: pasif ya da silinmiş ürünün seçeneği listelenmez, böyle kalan boş bölümlü menü hiç gösterilmez
    /// (sitenin vitrini). Tükenmiş ürün listede kalır, IsAvailable bayrağıyla işaretlenir.
    /// </param>
    /// <param name="localNow">Şubenin yerel saati: kategori servis penceresi (menünün ve seçeneklerin kategorisi) buna göre.</param>
    public static async Task<List<OnlineSetMenuDto>> LoadAsync(
        IAppDbContext db, Guid branchId, string cdnBaseUrl, bool listedOnly, DateTime localNow, CancellationToken cancellationToken)
    {
        List<SetMenu> setMenus = await db.SetMenus.AsNoTracking()
            .Include(s => s.Slots).ThenInclude(slot => slot.Options).ThenInclude(o => o.Product)
            .Where(s => s.BranchId == branchId && s.IsActive && !s.IsDeleted)
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .ToListAsync(cancellationToken);

        // Pencere tanımlı kategoriler (menünün kendisi ve seçenek ürünleri için).
        Dictionary<Guid, Category> windowed = await db.Categories.AsNoTracking()
            .Where(c => c.BranchId == branchId && (c.AvailableDays != null || c.AvailableFrom != null || c.AvailableUntil != null))
            .ToDictionaryAsync(c => c.Id, cancellationToken);
        bool CategoryOpen(Guid? categoryId) => categoryId is not Guid id || !windowed.TryGetValue(id, out Category? c) || c.IsAvailableAt(localNow);

        List<OnlineSetMenuDto> menus = setMenus.Select(s =>
        {
            OnlineSetMenuDto dto = ToDto(s, cdnBaseUrl, listedOnly, CategoryOpen);
            if (s.CategoryId is Guid categoryId && windowed.TryGetValue(categoryId, out Category? category))
            {
                dto.AvailableNow = category.IsAvailableAt(localNow);
                dto.AvailabilityLabel = category.AvailabilityLabel();
            }
            return dto;
        }).ToList();
        return listedOnly
            ? menus.Where(m => m.Slots.Count > 0 && m.Slots.All(slot => slot.Options.Count > 0)).ToList()
            : menus;
    }

    private static OnlineSetMenuDto ToDto(SetMenu s, string cdnBaseUrl, bool listedOnly, Func<Guid?, bool> categoryOpen)
    {
        List<OnlineSetMenuSlotDto> slots = s.Slots
            .OrderBy(slot => slot.SortOrder)
            .Select(slot => new OnlineSetMenuSlotDto
            {
                Id = slot.Id,
                Name = slot.Name,
                IsFixed = slot.IsFixed,
                Options = slot.Options
                    .Where(o => !listedOnly || (o.Product.IsActive && !o.Product.IsDeleted))
                    .Select(o => new OnlineSetMenuOptionDto
                    {
                        ProductId = o.ProductId,
                        ProductName = o.Product.Name,
                        Surcharge = o.Surcharge,
                        IsDefault = o.IsDefault,
                        // Seçeneğin kategorisi servis penceresi dışındaysa (pide fırını kapandı) seçilemez.
                        IsAvailable = o.Product.IsActive && !o.Product.IsOutOfStock && !o.Product.IsDeleted && categoryOpen(o.Product.CategoryId),
                        Allergens = (int)o.Product.Allergens,
                        DietTags = (int)o.Product.DietTags
                    }).ToList()
            })
            .ToList();

        return new OnlineSetMenuDto
        {
            Id = s.Id,
            Name = s.Name,
            Description = s.Description,
            Price = s.Price,
            RegularPrice = s.GetRegularPrice(),
            ImageUrl = string.IsNullOrWhiteSpace(s.ImageUrl) ? string.Empty : $"{cdnBaseUrl}/{s.ImageUrl}",
            IsStockImage = StorageKeys.IsShared(s.ImageUrl),
            CategoryId = s.CategoryId,
            IsAvailable = slots.Count > 0 && slots.All(slot => slot.Options.Any(o => o.IsAvailable)),
            IsFeatured = s.IsFeatured,
            Allergens = (int)SetMenuDietary.Allergens(slots.SelectMany(slot => slot.Options).Select(o => (ProductAllergen)o.Allergens)),
            DietTags = (int)SetMenuDietary.DietTags(slots.SelectMany(slot => slot.Options).Select(o => (ProductDietTag)o.DietTags)),
            Slots = slots
        };
    }
}
