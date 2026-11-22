namespace RestaurantBill.Domain.Enums;

/// <summary>
/// Ürünün "uygun" bilgileri (vegan, helal…) ve "Acılı" işareti. Sabit liste, bayrak olarak tek sütunda
/// (Product.DietTags) saklanır; değerler kalıcıdır.
/// </summary>
[Flags]
public enum ProductDietTag
{
    None = 0,
    Vegan = 1 << 0,
    Vegetarian = 1 << 1,
    GlutenFree = 1 << 2,
    Halal = 1 << 3,
    // Bilgi etiketi: bir "uygunluk" iddiası değildir, menüde birleştirmede içerik gibi davranır.
    Spicy = 1 << 4,
}

public static class ProductDietTags
{
    public const int All = (1 << 5) - 1;
    /// <summary>Uygunluk iddiaları (menüde yalnız bütün seçenekler taşıyorsa geçerli). Acılı bunlara dahil değil.</summary>
    public const ProductDietTag Claims = ProductDietTag.Vegan | ProductDietTag.Vegetarian | ProductDietTag.GlutenFree | ProductDietTag.Halal;
}
