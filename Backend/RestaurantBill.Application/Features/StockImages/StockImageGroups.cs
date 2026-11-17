using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.StockImages;

/// <summary>Hazır görsel kütüphanesinin hangi bölümü: hepsi, yalnız mekân/ortam fotoğrafları ya da yalnız yemekler.</summary>
public enum StockImageScope
{
    /// <summary>Hepsi (varsayılan; eski çağrılar böyle kalır).</summary>
    All = 0,
    /// <summary>Site fotoğrafları (kapak, hakkımızda, mekân, galeri…): mekân grupları önce.</summary>
    Venue = 1,
    /// <summary>Ürün ve menü görselleri: mekân grupları hariç.</summary>
    Food = 2
}

/// <summary>
/// Mekân/ortam fotoğraflarına ayrılmış grup adları (seed dosyasındaki <c>group</c> alanı birebir bunlardan biri olmalı).
/// Sıra, mekân kapsamındaki varsayılan listenin sırasıdır. Bunların dışındaki her grup yemek/içecek sayılır.
/// </summary>
public static class StockImageGroups
{
    public static readonly IReadOnlyList<string> Venue = ["Mekân", "Kafe", "Teras ve bahçe", "Bar ve mutfak", "Masa ve sofra"];

    private static readonly string[] FoldedVenue = Venue.Select(SearchText.Fold).ToArray();

    /// <summary>Grup mekân gruplarından biri mi (Türkçe harf ve büyük/küçük harf duyarsız).</summary>
    public static bool IsVenue(string? group) => VenueOrder(group) >= 0;

    /// <summary>Mekân grubunun listedeki yeri; mekân grubu değilse -1.</summary>
    public static int VenueOrder(string? group)
    {
        string folded = SearchText.Fold(group);
        return folded.Length == 0 ? -1 : Array.IndexOf(FoldedVenue, folded);
    }
}
