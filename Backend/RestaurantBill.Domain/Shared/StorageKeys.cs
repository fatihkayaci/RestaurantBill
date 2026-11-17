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

    /// <summary>Yüklemelerin konduğu klasörler: "{klasör}/{şube ya da şirket id}/{dosya}.webp".</summary>
    public static readonly IReadOnlyList<string> UploadFolders = ["products", "site"];

    /// <summary>Bir şubenin/şirketin kendi yükleme klasörleri ("products/{id:N}/", "site/{id:N}/").</summary>
    public static IEnumerable<string> OwnFoldersOf(Guid ownerId)
        => UploadFolders.Select(folder => $"{folder}/{ownerId:N}/");

    /// <summary>
    /// Toplu silinebilecek bir klasör mü: tam olarak "{yükleme klasörü}/{32 haneli id}/". Kök, paylaşılan klasör ya da
    /// başka bir biçim asla kabul edilmez (yanlış bir önek bütün depoyu silebilir).
    /// </summary>
    public static bool IsOwnFolder(string? folder)
    {
        if (string.IsNullOrWhiteSpace(folder) || IsShared(folder))
            return false;

        string[] parts = folder.Split('/');
        return parts.Length == 3
            && UploadFolders.Contains(parts[0])
            && parts[1].Length == 32
            && Guid.TryParseExact(parts[1], "N", out Guid id)
            && id != Guid.Empty
            && parts[2].Length == 0;
    }
}
