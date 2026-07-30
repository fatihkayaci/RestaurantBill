using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
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
            IEnumerable<Restaurant> restaurants = await _uow.Restaurant.GetAllAsync(r => r.OwnerUserId == _currentUser.UserId, false);
            List<int> restaurantIds = restaurants.Select(r => r.Id).ToList();

            IEnumerable<Table> tables = await _uow.Table.GetAllAsync(t => restaurantIds.Contains(t.RestaurantId), false);
            IEnumerable<UserRestaurant> staff = await _uow.UserRestaurant.GetAllAsync(ur => restaurantIds.Contains(ur.RestaurantId), false, "User");
            IEnumerable<Order> orders = await _uow.Order.GetAllAsync(o => restaurantIds.Contains(o.Table.RestaurantId), false);

            Dictionary<int, int> tableCounts = tables.GroupBy(t => t.RestaurantId).ToDictionary(g => g.Key, g => g.Count());
            Dictionary<int, int> staffCounts = staff.GroupBy(s => s.RestaurantId).ToDictionary(g => g.Key, g => g.Count());
            Dictionary<int, decimal> revenueByRestaurant = orders.GroupBy(o => o.Table.RestaurantId).ToDictionary(g => g.Key, g => g.Sum(o => o.TotalPrice));
            Dictionary<int, string> managerNames = staff
                .Where(s => s.Role == UserRole.Admin)
                .GroupBy(s => s.RestaurantId)
                .ToDictionary(g => g.Key, g => g.First().User.FullName);

            List<BranchDto> result = restaurants.Select(r => r.ToBranchDto(
                tableCounts.GetValueOrDefault(r.Id),
                staffCounts.GetValueOrDefault(r.Id),
                revenueByRestaurant.GetValueOrDefault(r.Id),
                managerNames.GetValueOrDefault(r.Id)
            )).ToList();

            return Result<List<BranchDto>>.Success(result);
        }
    }
}
