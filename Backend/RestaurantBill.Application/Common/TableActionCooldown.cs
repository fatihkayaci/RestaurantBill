namespace RestaurantBill.Application.Common;

public enum TableAction
{
    CallWaiter = 1,
    BillRequest = 2,
}

// Masa QR'ından "Garson çağır" ve "Hesap iste" için masa başına bekleme süresi: aynı masadan aynı istek pencere
// içinde ikinci kez bildirilmez (masadaki birkaç telefon ya da tekrar tekrar basılan düğme garsonu meşgul etmesin).
// Kayıt tutulmaz, bellekte durur: uygulama yeniden başlarsa ya da birden fazla sunucu çalışırsa pencere sıfırlanır;
// bunun bedeli en kötü ihtimalle bir fazla bildirimdir. IP başına sınır ayrıca rate-limit politikasıyla uygulanır.
// Singleton olarak kaydedilir.
public sealed class TableActionCooldown(TimeProvider clock)
{
    public static readonly TimeSpan Window = TimeSpan.FromSeconds(60);

    // Sözlük bu boyutu aşınca süresi dolmuş kayıtlar temizlenir.
    private const int PruneThreshold = 1024;

    private readonly Dictionary<(TableAction Action, Guid TableId), DateTimeOffset> _last = [];
    private readonly Lock _lock = new();

    /// <summary>
    /// Pencere boşsa isteği kaydeder ve null döner (bildirim gönderilebilir). Doluysa hiçbir şey değiştirmez ve
    /// kalan süreyi döner.
    /// </summary>
    public TimeSpan? TryStart(TableAction action, Guid tableId)
    {
        DateTimeOffset now = clock.GetUtcNow();
        lock (_lock)
        {
            if (_last.TryGetValue((action, tableId), out DateTimeOffset last) && now - last < Window)
                return Window - (now - last);

            if (_last.Count >= PruneThreshold)
            {
                foreach (var key in _last.Where(kv => now - kv.Value >= Window).Select(kv => kv.Key).ToList())
                    _last.Remove(key);
            }

            _last[(action, tableId)] = now;
            return null;
        }
    }

    /// <summary>Kayıtlı istek sonradan başarısız olduysa pencereyi geri açar.</summary>
    public void Release(TableAction action, Guid tableId)
    {
        lock (_lock)
            _last.Remove((action, tableId));
    }

    /// <summary>Kalan süre, yukarı yuvarlanmış saniye (müşteriye gösterilir).</summary>
    public static int Seconds(TimeSpan remaining) => Math.Max(1, (int)Math.Ceiling(remaining.TotalSeconds));
}
