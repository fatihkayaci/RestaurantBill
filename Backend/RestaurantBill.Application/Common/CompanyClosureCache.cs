using System.Collections.Concurrent;

namespace RestaurantBill.Application.Common;

/// <summary>
/// Şirket kapatıldı mı: her API isteğinde veritabanına sormamak için kısa süreli bellek. Kapatma ve vazgeçme kaydı
/// hemen günceller; başka bir sunucu örneği en geç <see cref="Ttl"/> sonra yeni durumu görür. Tek örnek (singleton).
/// </summary>
public sealed class CompanyClosureCache
{
    public static readonly TimeSpan Ttl = TimeSpan.FromSeconds(30);

    private readonly ConcurrentDictionary<Guid, (bool Closed, DateTime FetchedAt)> _entries = new();

    public bool TryGet(Guid companyId, DateTime nowUtc, out bool closed)
    {
        if (_entries.TryGetValue(companyId, out var entry) && nowUtc - entry.FetchedAt < Ttl)
        {
            closed = entry.Closed;
            return true;
        }
        closed = false;
        return false;
    }

    public void Set(Guid companyId, bool closed, DateTime nowUtc) => _entries[companyId] = (closed, nowUtc);
}
