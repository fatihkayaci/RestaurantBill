using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.CustomerSite;

// Talep kalemleri (ürün ya da menü) için ortak okuma: gerekli Include'lar, birim fiyat ve personele/müşteriye giden satır.
public static class OrderRequestLines
{
    /// <summary>Kalemlerin ürünü ve menü kalemlerinin bölüm/seçenek/ürünleri.</summary>
    public static IQueryable<OrderRequest> IncludeLines(this IQueryable<OrderRequest> query)
        => query
            .Include(r => r.Items).ThenInclude(i => i.Product)
            .Include(r => r.Items).ThenInclude(i => i.SetMenu!).ThenInclude(s => s.Slots).ThenInclude(slot => slot.Options).ThenInclude(o => o.Product);

    /// <summary>Menü kaleminin seçenekleri, bölüm sırasıyla; menü ya da seçim artık yoksa o bölüm atlanır.</summary>
    private static List<(SetMenuSlot Slot, SetMenuSlotOption Option)> ChosenOptions(OrderRequestItem item)
    {
        if (item.SetMenu is null)
            return [];
        Dictionary<Guid, Guid> selections = DeliveryScope.ParseSelections(item.SelectionsJson);
        var chosen = new List<(SetMenuSlot, SetMenuSlotOption)>();
        foreach (SetMenuSlot slot in item.SetMenu.Slots.OrderBy(s => s.SortOrder))
        {
            SetMenuSlotOption? option = selections.TryGetValue(slot.Id, out Guid productId)
                ? slot.Options.FirstOrDefault(o => o.ProductId == productId)
                : null;
            if (option is not null)
                chosen.Add((slot, option));
        }
        return chosen;
    }

    /// <summary>Anlık görüntü (ön sipariş) varsa o; yoksa güncel fiyat (menüde seçim farkları dahil).</summary>
    public static decimal UnitPriceOf(OrderRequestItem item)
    {
        if (item.UnitPrice is decimal snapshot)
            return snapshot;
        if (item.IsSetMenu)
            return (item.SetMenu?.Price ?? 0m) + ChosenOptions(item).Sum(c => c.Option.Surcharge);
        return item.Product?.Price ?? 0m;
    }

    public static decimal TotalOf(OrderRequest request) => request.Items.Sum(i => UnitPriceOf(i) * i.Quantity);

    public static OrderRequestItemDto ToDto(OrderRequestItem item) => new()
    {
        Kind = item.IsSetMenu ? CartLineInput.SetMenuKind : CartLineInput.ProductKind,
        ProductId = item.ProductId,
        SetMenuId = item.SetMenuId,
        ProductName = item.IsSetMenu ? item.SetMenu?.Name ?? string.Empty : item.Product?.Name ?? string.Empty,
        // Sepetteki gibi: yalnız seçimli bölümler (sabit parçalar menünün adında zaten var).
        Selections = item.IsSetMenu
            ? ChosenOptions(item)
                .Where(c => !c.Slot.IsFixed)
                .Select(c => c.Option.Surcharge > 0 ? $"{c.Option.Product.Name} (+₺{c.Option.Surcharge:0.##})" : c.Option.Product.Name)
                .ToList()
            : [],
        Quantity = item.Quantity,
        UnitPrice = UnitPriceOf(item),
        Note = item.Note,
        IsTakeaway = item.IsTakeaway
    };
}
