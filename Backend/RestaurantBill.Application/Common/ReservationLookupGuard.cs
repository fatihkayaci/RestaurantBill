namespace RestaurantBill.Application.Common;

// "Rezervasyon sorgula" için kod başına hatalı deneme sınırı: aynı kodla pencere içinde MaxFailures kez yanlış telefon
// (ya da var olmayan kod) girilirse o kodla sorgu LockDuration boyunca kapanır. Kodun var olup olmadığına bakılmadan
// uygulanır; kilit de kodun gerçek olduğunu ele vermez. TableActionCooldown gibi bellekte durur: uygulama yeniden
// başlarsa sayaçlar sıfırlanır. IP başına sınır ayrıca rate-limit politikasıyla ("reservation-lookup") uygulanır.
// Singleton olarak kaydedilir.
public sealed class ReservationLookupGuard(TimeProvider clock)
{
    public const int MaxFailures = 5;
    public static readonly TimeSpan LockDuration = TimeSpan.FromMinutes(15);

    // Sözlük bu boyutu aşınca süresi dolmuş kayıtlar temizlenir.
    private const int PruneThreshold = 4096;

    private sealed class Entry
    {
        public int Failures;
        public DateTimeOffset WindowStart;
        public DateTimeOffset? LockedUntil;
    }

    private readonly Dictionary<string, Entry> _entries = [];
    private readonly Lock _lock = new();

    /// <summary>Kod kilitliyse kalan süreyi, değilse null döner.</summary>
    public TimeSpan? LockedFor(string code)
    {
        DateTimeOffset now = clock.GetUtcNow();
        lock (_lock)
        {
            if (_entries.TryGetValue(code, out Entry? entry) && entry.LockedUntil is DateTimeOffset until && until > now)
                return until - now;
            return null;
        }
    }

    /// <summary>Hatalı denemeyi sayar; sınıra ulaşılırsa kodu kilitler.</summary>
    public void RecordFailure(string code)
    {
        DateTimeOffset now = clock.GetUtcNow();
        lock (_lock)
        {
            if (_entries.Count >= PruneThreshold)
            {
                foreach (string key in _entries.Where(kv => IsStale(kv.Value, now)).Select(kv => kv.Key).ToList())
                    _entries.Remove(key);
            }

            if (!_entries.TryGetValue(code, out Entry? entry) || IsStale(entry, now))
            {
                entry = new Entry { WindowStart = now };
                _entries[code] = entry;
            }

            entry.Failures++;
            if (entry.Failures >= MaxFailures)
            {
                entry.LockedUntil = now + LockDuration;
                entry.Failures = 0;
                entry.WindowStart = now;
            }
        }
    }

    /// <summary>Başarılı sorgudan sonra kodun sayacı sıfırlanır.</summary>
    public void Reset(string code)
    {
        lock (_lock)
            _entries.Remove(code);
    }

    // Kilit bitmiş ve son hatalı denemeden beri bir kilit süresi geçmişse kayıt atılabilir.
    private static bool IsStale(Entry entry, DateTimeOffset now)
        => (entry.LockedUntil is null || entry.LockedUntil <= now) && now - entry.WindowStart >= LockDuration;
}
