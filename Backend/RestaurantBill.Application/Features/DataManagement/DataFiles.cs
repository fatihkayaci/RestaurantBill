using Microsoft.Extensions.Logging;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.DataManagement;

// CDN dosyaları veritabanı işlemi onaylandıktan SONRA silinir. Dosya silinemezse veri silme geri alınmaz: hata loglanır,
// dosya depoda kalır (kimse ona bağlanmaz). Paylaşılan (shared/) anahtar ve klasörler hiçbir zaman silinmez.
internal static class DataFiles
{
    public static async Task<int> DeleteAsync(IImageStorageService storage, IEnumerable<string> keys, IEnumerable<string> folders,
        ILogger logger, CancellationToken cancellationToken)
    {
        int failures = 0;

        foreach (string key in keys.Where(k => !string.IsNullOrWhiteSpace(k) && !StorageKeys.IsShared(k)).Distinct())
        {
            try
            {
                await storage.DeleteAsync(key, cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                failures++;
                logger.LogError(ex, "Veri silme: CDN dosyası silinemedi, depoda kaldı: {Key}", key);
            }
        }

        foreach (string folder in folders.Where(StorageKeys.IsOwnFolder).Distinct())
        {
            try
            {
                await storage.DeleteFolderAsync(folder, cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                failures++;
                logger.LogError(ex, "Veri silme: CDN klasörü silinemedi, depoda kaldı: {Folder}", folder);
            }
        }

        return failures;
    }
}
