using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Common;

public static class ImageStorageExtensions
{
    /// <summary>
    /// Görseli değişen ya da silinen kaydın eski dosyasını CDN'den kaldırır. Kayıt zaten kaydedildikten sonra
    /// çağrılır, bu yüzden en iyi çabadır: silme hatası isteği bozmaz. Boş anahtar ve paylaşılan anahtar
    /// (<see cref="StorageKeys.IsShared"/>, ör. hazır görsel kütüphanesi) hiç silinmez; başka ürünler de onu kullanır.
    /// Dosya silen her handler bunu kullanır.
    /// </summary>
    public static async Task DeleteReplacedImageAsync(this IImageStorageService imageStorage, string? key, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(key) || StorageKeys.IsShared(key))
            return;

        try
        {
            await imageStorage.DeleteAsync(key, cancellationToken);
        }
        catch
        {
            // Yeni durum kaydedildi; CDN'de kalan eski dosya yüzünden isteği başarısız saymayız.
        }
    }
}
