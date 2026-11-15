namespace RestaurantBill.Domain.Enums;

/// <summary>Set menüde ürüne ya da menünün tamamına uygulanan indirim türü.</summary>
public enum DiscountType
{
    None = 0,
    /// <summary>Yüzde: değer 0–100 arası (%10 → fiyatın onda biri düşer).</summary>
    Percent = 1,
    /// <summary>Tutar: değer ₺ olarak düşülür.</summary>
    Amount = 2
}
