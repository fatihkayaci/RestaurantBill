using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Interfaces;

public interface IReportScopeResolver
{
    /// <summary>
    /// Admin için her zaman kendi tek şubesini döndürür (requestedBranchId yok sayılır).
    /// Owner için requestedBranchId verilmişse (ve sahipliği doğrulanmışsa) o tek şubeyi,
    /// verilmemişse owner'ın tüm şubelerini döndürür. Yetkisiz/bulunamayan durumda boş liste döner.
    /// </summary>
    Task<List<Branch>> ResolveAsync(Guid? requestedBranchId, CancellationToken cancellationToken);
}
