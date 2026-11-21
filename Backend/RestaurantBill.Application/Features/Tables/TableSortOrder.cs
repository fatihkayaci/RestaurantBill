using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Tables;

public static class TableSortOrder
{
    /// <summary>Bölgenin sonuna gelecek sıra: şu anki en büyük sıradan bir fazla (boş bölgede 0).</summary>
    public static async Task<int> EndOfRegionAsync(IAppDbContext db, Guid regionId, CancellationToken cancellationToken)
    {
        int? last = await db.Tables
            .Where(t => t.RegionId == regionId)
            .MaxAsync(t => (int?)t.SortOrder, cancellationToken);
        return (last ?? -1) + 1;
    }
}
