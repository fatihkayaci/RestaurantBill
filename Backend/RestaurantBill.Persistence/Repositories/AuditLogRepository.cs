using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Persistence.Repositories;

public class AuditLogRepository : GenericRepository<AuditLog>, IAuditLogRepository
{
    public AuditLogRepository(RestaurantBillDbContext context) : base(context)
    {
    }

    public async Task<List<string>> GetDistinctActorNamesAsync(IEnumerable<Guid> branchIds)
    {
        return await _context.Set<AuditLog>()
            .AsNoTracking()
            .Where(l => branchIds.Contains(l.BranchId))
            .Select(l => l.ActorName)
            .Distinct()
            .OrderBy(name => name)
            .ToListAsync();
    }
}
