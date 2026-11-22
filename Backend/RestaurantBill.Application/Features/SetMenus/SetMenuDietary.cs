using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.SetMenus;

// Menünün (set) alerjen ve diyet etiketleri, seçeneklerin ürünlerinden türetilir (menüde ayrıca girilmez).
public static class SetMenuDietary
{
    /// <summary>Alerjenler: seçeneklerin birleşimi; hangi seçenek seçilirse seçilsin içerebileceği her şey.</summary>
    public static ProductAllergen Allergens(IEnumerable<ProductAllergen> options)
        => options.Aggregate(ProductAllergen.None, (all, a) => all | a);

    /// <summary>
    /// Etiketler: "Acılı" (bilgi) seçeneklerin birleşimidir. Uygunluk iddiaları (vegan, vejetaryen, glutensiz, helal)
    /// yalnız bütün seçenekler taşıyorsa menüye geçer; aksi halde etli bir seçenek menüyü "vegan" gösterirdi.
    /// </summary>
    public static ProductDietTag DietTags(IEnumerable<ProductDietTag> options)
    {
        List<ProductDietTag> list = options.ToList();
        if (list.Count == 0) return ProductDietTag.None;

        ProductDietTag info = list.Aggregate(ProductDietTag.None, (all, t) => all | t) & ~ProductDietTags.Claims;
        ProductDietTag claims = list.Aggregate(ProductDietTags.Claims, (all, t) => all & t);
        return info | claims;
    }
}
