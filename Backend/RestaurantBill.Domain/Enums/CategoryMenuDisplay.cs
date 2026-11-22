namespace RestaurantBill.Domain.Enums;

/// <summary>Kategorinin müşteri menüsündeki görünümü (sitenin menü sayfası, Sophra tasarımı).</summary>
public enum CategoryMenuDisplay
{
    /// <summary>Seçilmemiş: fotoğraflı kart gibi davranır (kendiliğinden listeye geçilmez).</summary>
    Auto = 0,
    /// <summary>Fotoğraflı kartlar.</summary>
    Cards = 1,
    /// <summary>Sıkı liste (ad, fiyat, ekle).</summary>
    List = 2,
}
