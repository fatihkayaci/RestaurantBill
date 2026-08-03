using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Queries.GetMyBranches
{
    public class GetMyBranchesQueryHandler : IRequestHandler<GetMyBranchesQuery, Result<List<BranchDto>>>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public GetMyBranchesQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result<List<BranchDto>>> Handle(GetMyBranchesQuery request, CancellationToken cancellationToken)
        {
            IEnumerable<Branch> branches = (await _uow.Branch.GetAllAsync(b => b.Company.OwnerUserId == _currentUser.UserId, false, nameof(Branch.Company)))
                .OrderBy(b => b.CreatedAt);
            List<Guid> branchIds = branches.Select(b => b.Id).ToList();

            IEnumerable<Table> tables = await _uow.Table.GetAllAsync(t => branchIds.Contains(t.Region.BranchId), false, nameof(Table.Region));
            IEnumerable<UserBranch> staff = await _uow.UserBranch.GetAllAsync(ur => branchIds.Contains(ur.BranchId), false);
            IEnumerable<Order> orders = await _uow.Order.GetAllAsync(o => branchIds.Contains(o.Table.Region.BranchId), false, $"{nameof(Order.Table)}.{nameof(Table.Region)}");

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
