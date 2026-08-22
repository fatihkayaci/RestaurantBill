using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Queries.GetMyBranches
{
    public class GetMyBranchesQueryHandler : IRequestHandler<GetMyBranchesQuery, Result<List<BranchDto>>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetMyBranchesQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<List<BranchDto>>> Handle(GetMyBranchesQuery request, CancellationToken cancellationToken)
        {
            List<Branch> branches = await _db.Branches
                .AsNoTracking()
                .Where(b => b.Company.OwnerUserId == _currentUser.UserId)
                .OrderBy(b => b.CreatedAt)
                .ToListAsync(cancellationToken);
            List<Guid> branchIds = branches.Select(b => b.Id).ToList();

            List<Table> tables = await _db.Tables
                .AsNoTracking()
                .Where(t => branchIds.Contains(t.Region.BranchId))
                .ToListAsync(cancellationToken);
            List<UserBranch> staff = await _db.UserBranches
                .AsNoTracking()
                .Where(ur => branchIds.Contains(ur.BranchId))
                .ToListAsync(cancellationToken);
            List<Order> orders = await _db.Orders
                .AsNoTracking()
                .Where(o => branchIds.Contains(o.Table.Region.BranchId))
                .ToListAsync(cancellationToken);

            Dictionary<Guid, int> tableCounts = tables.GroupBy(t => t.Region.BranchId).ToDictionary(g => g.Key, g => g.Count());
            Dictionary<Guid, int> staffCounts = staff.GroupBy(s => s.BranchId).ToDictionary(g => g.Key, g => g.Count());
            Dictionary<Guid, decimal> revenueByRestaurant = orders.GroupBy(o => o.Table.Region.BranchId).ToDictionary(g => g.Key, g => g.Sum(o => o.TotalPrice));

            List<BranchDto> result = branches.Select(b => b.ToBranchDto(
                tableCounts.GetValueOrDefault(b.Id),
                staffCounts.GetValueOrDefault(b.Id),
                revenueByRestaurant.GetValueOrDefault(b.Id)
            )).ToList();

            return Result<List<BranchDto>>.Success(result);
        }
    }
}
