namespace RestaurantBill.Domain.Enums;

/// <summary>
/// Ürünün içerdiği alerjenler (AB'nin 14 alerjeni). Sabit liste, bayrak olarak tek sütunda (Product.Allergens) saklanır;
/// değerler kalıcıdır, sırası değiştirilmez. Türkçe adlar ön yüzde tek dosyadadır (features/products/dietaryTags.ts).
/// </summary>
[Flags]
public enum ProductAllergen
{
    None = 0,
    Gluten = 1 << 0,
    Milk = 1 << 1,
    Eggs = 1 << 2,
    Peanuts = 1 << 3,
    // Sert kabuklu yemişler: antep fıstığı, ceviz, fındık, badem…
    TreeNuts = 1 << 4,
    Sesame = 1 << 5,
    Soy = 1 << 6,
    Fish = 1 << 7,
    Crustaceans = 1 << 8,
    Molluscs = 1 << 9,
    Mustard = 1 << 10,
    Celery = 1 << 11,
    Sulphites = 1 << 12,
    Lupin = 1 << 13,
}

public static class ProductAllergens
{
    public const int All = (1 << 14) - 1;
}
