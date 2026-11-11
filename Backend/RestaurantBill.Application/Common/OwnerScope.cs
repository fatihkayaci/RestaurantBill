using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Common;

// Owner iki kapsamda çalışır: bir şube (token'daki RestaurantId = Branch.Id) ya da "Tümü" (RestaurantId = Company.Id).
// Girişte tek şubesi olan sahibi doğrudan şube moduna alıyoruz; şube/yönetici kavramı ona hiç görünmesin.
public static class OwnerScope
{
    public static async Task<Guid> ResolveInitialScopeIdAsync(IAppDbContext db, Guid companyId, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await db.Branches
            .AsNoTracking()
            .Where(b => b.CompanyId == companyId && !b.IsDeleted)
            .OrderBy(b => b.CreatedAt)
            .Select(b => b.Id)
            .Take(2)
            .ToListAsync(cancellationToken);

        return branchIds.Count == 1 ? branchIds[0] : companyId;
    }
}
