using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Infrastructure.Services;

public class ReportScopeResolver : IReportScopeResolver
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public ReportScopeResolver(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<List<Branch>> ResolveAsync(Guid? requestedBranchId, CancellationToken cancellationToken)
    {
        if (_currentUser.Role == "Owner")
        {
            IQueryable<Branch> ownerBranches = _db.Branches
                .AsNoTracking()
                .Where(b => b.Company.OwnerUserId == _currentUser.UserId);

            if (requestedBranchId is Guid branchId)
                ownerBranches = ownerBranches.Where(b => b.Id == branchId);

            return await ownerBranches.OrderBy(b => b.CreatedAt).ToListAsync(cancellationToken);
        }

        if (_currentUser.BranchId == Guid.Empty)
            return [];

        Branch? branch = await _db.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == _currentUser.BranchId, cancellationToken);

        return branch is null ? [] : [branch];
    }
}
