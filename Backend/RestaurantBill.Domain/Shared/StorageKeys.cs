namespace RestaurantBill.Domain.Shared;

/// <summary>
/// CDN depolama anahtarlarının kuralları. <c>shared/</c> altındaki dosyalar tek bir restorana ait değildir
/// (hazır görsel kütüphanesi gibi): birçok ürün aynı anahtarı gösterir. Bu yüzden bir ürünün görseli değişince
/// ya da ürün silinince bu dosyalar ASLA silinmez. Dosya silen her yer <see cref="IsShared"/> ile kontrol eder.
/// </summary>
public static class StorageKeys
{
    /// <summary>Paylaşılan dosyaların kök klasörü.</summary>
    public const string SharedPrefix = "shared/";

    /// <summary>Hazır görsel kütüphanesinin klasörü (<see cref="SharedPrefix"/> altında).</summary>
    public const string StockPrefix = "shared/stock/";

    /// <summary>Anahtar paylaşılan klasörde mi (büyük/küçük harf ve baştaki "/" önemsiz). Boş anahtar paylaşılan değildir.</summary>
    public static bool IsShared(string? key)
    {
        if (string.IsNullOrWhiteSpace(key))
            return false;

        return key.Trim().TrimStart('/').StartsWith(SharedPrefix, StringComparison.OrdinalIgnoreCase);
    }
}
