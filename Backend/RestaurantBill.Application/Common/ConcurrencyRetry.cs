using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Common;

// Siparişin xmin satır sürümü (concurrency token) yüzünden, aynı saniyede aynı siparişe ekleme yapan iki istekten
// ikincisi DbUpdateConcurrencyException alır. Ekleme işlemleri birbirini ezmez (her biri yalnızca satır ekler), bu yüzden
// çakışmada isteği baştan uygulamak güvenlidir: izlenen kayıtlar atılır, sipariş veritabanından taze okunur ve
// satırlar istekten (önceki denemenin değiştirdiği nesnelerden değil) yeniden eklenir. Çakışan kayıt hiç kaydedilmediği
// için satırlar iki kez eklenmez.
public static class ConcurrencyRetry
{
    /// <summary>Varsayılan yeniden deneme sayısı (ilk denemeyle birlikte en fazla 3 deneme).</summary>
    public const int DefaultMaxRetries = 2;

    /// <summary>
    /// <paramref name="attempt"/>'i çalıştırır; içindeki SaveChanges eşzamanlı güncelleme çakışması verirse izlenen kayıtları
    /// temizleyip en fazla <paramref name="maxRetries"/> kez yeniden dener. Deneme her seferinde kaydı kendisi yüklemelidir.
    /// Son denemede de çakışırsa hata yukarı fırlar (ExceptionMiddleware 409 döner).
    /// </summary>
    public static async Task<T> ExecuteAsync<T>(
        IAppDbContext db, Func<CancellationToken, Task<T>> attempt, CancellationToken cancellationToken, int maxRetries = DefaultMaxRetries)
    {
        for (int retry = 0; ; retry++)
        {
            try
            {
                return await attempt(cancellationToken);
            }
            catch (DbUpdateConcurrencyException) when (retry < maxRetries)
            {
                db.ChangeTracker.Clear();
            }
        }
    }
}
