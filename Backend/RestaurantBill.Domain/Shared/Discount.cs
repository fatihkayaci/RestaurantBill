using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Shared;

/// <summary>İndirim hesapları: türün ve değerin geçerliliği ve fiyata uygulanması.</summary>
public static class Discount
{
    /// <summary>Geçersiz indirimde hata atar. Tür None ise değer 0 olmalıdır.</summary>
    public static void Validate(DiscountType type, decimal value, string subject)
    {
        if (!Enum.IsDefined(type))
            throw new DomainException($"{subject}: geçersiz indirim türü.");
        if (value < 0)
            throw new DomainException($"{subject}: indirim 0'dan küçük olamaz.");
        if (type == DiscountType.Percent && value > 100)
            throw new DomainException($"{subject}: yüzde indirim en fazla %100 olabilir.");
        if (type == DiscountType.None && value != 0)
            throw new DomainException($"{subject}: indirim türü seçilmeden değer girilemez.");
    }

    /// <summary>İndirimli fiyat; kuruşa yuvarlanır, 0'ın altına inmez.</summary>
    public static decimal Apply(decimal price, DiscountType type, decimal value)
    {
        decimal discounted = type switch
        {
            DiscountType.Percent => price - price * value / 100m,
            DiscountType.Amount => price - value,
            _ => price
        };
        return Math.Max(0m, Math.Round(discounted, 2, MidpointRounding.AwayFromZero));
    }
}
