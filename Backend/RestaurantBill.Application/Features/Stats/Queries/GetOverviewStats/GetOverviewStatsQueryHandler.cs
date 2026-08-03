using MediatR;
using RestaurantBill.Application.DTOs.Stats;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Stats.Queries.GetOverviewStats
{
    public class GetOverviewStatsQueryHandler : IRequestHandler<GetOverviewStatsQuery, Result<OverviewStatsDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public GetOverviewStatsQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result<OverviewStatsDto>> Handle(GetOverviewStatsQuery request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;
            if(restaurantId == Guid.Empty) return Result<OverviewStatsDto>.Failure("ID değeri 0 veya negatif olamaz.");
            
            var orders = await _uow.Order.GetAllAsync(o => o.Table.Region.BranchId == restaurantId, false, "OrderItems,OrderItems.Product");
            var tables = await _uow.Table.GetAllAsync(t => t.Region.BranchId == restaurantId);

            decimal totalRevenue = orders.Sum(o => o.TotalPrice);
            int totalOrders = orders.Count();
            decimal avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            int occupiedTables = tables.Count(t => t.Status == Domain.Enums.TableStatus.Occupied);
            int totalTables = tables.Count();

            List<TopProductDto> topProducts = orders
                .SelectMany(o => o.OrderItems)
                .Where(i => i.Product != null)
                .GroupBy(i => i.Product!.Name)
                .Select(g => new TopProductDto
                {
                    Name = g.Key,
                    Sold = g.Sum(i => i.Quantity)
                })
                .OrderByDescending(p => p.Sold)
                .Take(5)
                .ToList();

            return Result<OverviewStatsDto>.Success(new OverviewStatsDto
            {
                TotalRevenue = totalRevenue,
                TotalOrders = totalOrders,
                AvgOrderValue = avgOrderValue,
                OccupiedTables = occupiedTables,
                TotalTables = totalTables,
                TopProducts = topProducts
            });
        }
    }
}
