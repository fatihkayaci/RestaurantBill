using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Common;

// Id ile gelen her kaydın, isteği yapan kullanıcının erişebildiği şubelere ait olduğunu garanti eder.
// Owner token'ında şube yerine CompanyId taşındığı için Owner'ın erişimi şirketinin tüm şubeleri üzerinden çözülür.
public static class BranchScope
{
    public static async Task<List<Guid>> GetAccessibleBranchIdsAsync(
        this IAppDbContext db, ICurrentUserService currentUser, CancellationToken cancellationToken)
    {
        if (currentUser.Role == "Owner")
        {
            return await db.Branches
                .AsNoTracking()
                .Where(b => b.Company.OwnerUserId == currentUser.UserId && !b.IsDeleted)
                .Select(b => b.Id)
                .ToListAsync(cancellationToken);
        }

        return currentUser.BranchId == Guid.Empty ? [] : [currentUser.BranchId];
    }

    // Liste ekranlarının çalışma kapsamı. Erişim kapsamından farkı: Owner bir şube seçmişse (token o şubenin
    // id'sini taşır) yalnızca o şube döner; "Tümü" modunda (token CompanyId taşır) tüm şubeler.
    // Erişim kapsamı owner için her zaman tüm şubelerdir, çünkü admin atama gibi işler şube modunda da
    // şirket genelinde çalışır; ama Gün Sonu gibi listeler seçili şubeyi göstermeli.
    public static async Task<List<Guid>> GetWorkingBranchIdsAsync(
        this IAppDbContext db, ICurrentUserService currentUser, CancellationToken cancellationToken)
    {
        List<Guid> accessible = await db.GetAccessibleBranchIdsAsync(currentUser, cancellationToken);
        bool ownerInBranch = currentUser.Role == "Owner"
            && currentUser.BranchId != Guid.Empty
            && currentUser.BranchId != currentUser.CompanyId;
        return ownerInBranch ? accessible.Where(id => id == currentUser.BranchId).ToList() : accessible;
    }

    public static IQueryable<Order> InBranches(this IQueryable<Order> query, IReadOnlyCollection<Guid> branchIds)
        => query.Where(o => branchIds.Contains(o.Table.Region.BranchId));

    public static IQueryable<Table> InBranches(this IQueryable<Table> query, IReadOnlyCollection<Guid> branchIds)
        => query.Where(t => branchIds.Contains(t.Region.BranchId));

    public static IQueryable<Region> InBranches(this IQueryable<Region> query, IReadOnlyCollection<Guid> branchIds)
        => query.Where(r => branchIds.Contains(r.BranchId));

    public static IQueryable<Category> InBranches(this IQueryable<Category> query, IReadOnlyCollection<Guid> branchIds)
        => query.Where(c => branchIds.Contains(c.BranchId));

    public static IQueryable<Product> InBranches(this IQueryable<Product> query, IReadOnlyCollection<Guid> branchIds)
        => query.Where(p => branchIds.Contains(p.Category.BranchId));

    public static IQueryable<CashRegister> InBranches(this IQueryable<CashRegister> query, IReadOnlyCollection<Guid> branchIds)
        => query.Where(c => branchIds.Contains(c.BranchId));

    public static IQueryable<Shift> InBranches(this IQueryable<Shift> query, IReadOnlyCollection<Guid> branchIds)
        => query.Where(s => branchIds.Contains(s.BranchId));

    public static IQueryable<UserBranch> InBranches(this IQueryable<UserBranch> query, IReadOnlyCollection<Guid> branchIds)
        => query.Where(ur => branchIds.Contains(ur.BranchId));
}
