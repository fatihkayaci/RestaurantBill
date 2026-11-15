using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Common;

// Bölgesi seçilmiş garsonun baktığı masalar. Her bölge için yöneticinin seçimi ayrı saklanır:
//   - "Tüm masalar": bölgenin tamamı;
//   - "Seçili masalar" (RestrictedRegionIds): yalnızca seçilmiş ve şu an o bölgede duran masalar. Hiçbiri kalmamışsa
//     (silindi, taşındı) garson o bölgede hiçbir masaya bakmaz; yetki kendiliğinden genişlemez.
// Örnek: Bahçe seçili masalar {B1, B2}, Salon tüm masalar → Bahçe'de yalnızca B1 ve B2, Salon'un tamamı.
// Bölgesi boş (tüm bölgelere bakan) garson için WaiterScope yoktur (null); masa seçimi onu daraltmaz.
public sealed class WaiterScope
{
    private WaiterScope(HashSet<Guid> wholeRegionIds, HashSet<Guid> tableIds)
    {
        WholeRegionIds = wholeRegionIds;
        TableIds = tableIds;
    }

    // Tamamına bakılan bölgeler.
    public IReadOnlySet<Guid> WholeRegionIds { get; }

    // Masa masa bakılan bölgelerde, şu an o bölgelerde duran seçili masalar.
    public IReadOnlySet<Guid> TableIds { get; }

    // Hiçbir masaya erişemeyen kapsam (üyeliği bulunamayan garson).
    public static WaiterScope Empty => new([], []);

    // selectedTables: garsonun seçtiği ve hâlâ var olan masalar, güncel bölgeleriyle. Masa masa bakılan bir bölgede
    // durmayan seçili masa hiçbir şey katmaz: tamamına bakılan bölgeye taşındıysa o bölge zaten kapsamda, seçilmemiş
    // bir bölgeye taşındıysa kapsam dışı.
    public static WaiterScope Resolve(
        IEnumerable<Guid> regionIds, IEnumerable<Guid> restrictedRegionIds, IEnumerable<(Guid TableId, Guid RegionId)> selectedTables)
    {
        HashSet<Guid> regions = regionIds.ToHashSet();
        HashSet<Guid> restricted = restrictedRegionIds.Where(regions.Contains).ToHashSet();

        return new WaiterScope(
            regions.Where(id => !restricted.Contains(id)).ToHashSet(),
            selectedTables.Where(t => restricted.Contains(t.RegionId)).Select(t => t.TableId).ToHashSet());
    }

    // TableIds yalnızca masa masa bakılan bölgelerdeki masaları içerir; bu yüzden masanın kendi kimliğine bakmak yeter.
    public bool Covers(Guid tableId, Guid regionId) => WholeRegionIds.Contains(regionId) || TableIds.Contains(tableId);
}

public static class WaiterScopeExtensions
{
    // Üyelikteki bölge ve masa seçiminden kapsamı güncel masa verisiyle kurar. Bölge seçilmemişse null (tüm bölgeler).
    // Silinmiş masalar Tables'ta olmadığı için kendiliğinden düşer.
    public static async Task<WaiterScope?> GetWaiterScopeAsync(
        this IAppDbContext db,
        IReadOnlyCollection<Guid> regionIds,
        IReadOnlyCollection<Guid> restrictedRegionIds,
        IReadOnlyCollection<Guid> tableIds,
        CancellationToken cancellationToken)
    {
        if (regionIds.Count == 0)
            return null;

        List<(Guid TableId, Guid RegionId)> selectedTables = [];
        if (tableIds.Count > 0)
        {
            var rows = await db.Tables.AsNoTracking()
                .Where(t => tableIds.Contains(t.Id))
                .Select(t => new { t.Id, t.RegionId })
                .ToListAsync(cancellationToken);
            selectedTables = rows.Select(t => (t.Id, t.RegionId)).ToList();
        }

        return WaiterScope.Resolve(regionIds, restrictedRegionIds, selectedTables);
    }
}
