using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Domain.Interfaces;

public interface IAuditLogRepository : IGenericRepository<AuditLog>
{
    Task<List<string>> GetDistinctActorNamesAsync(IEnumerable<Guid> branchIds);
}
