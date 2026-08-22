using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.Stats;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Stats.Queries.GetOverviewStats
{
    public class GetOverviewStatsQueryHandler : IRequestHandler<GetOverviewStatsQuery, Result<OverviewStatsDto>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetOverviewStatsQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<OverviewStatsDto>> Handle(GetOverviewStatsQuery request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;
            if (restaurantId == Guid.Empty) return Result<OverviewStatsDto>.Failure("Geçersiz şube bilgisi.");

            List<Order> orders = await _db.Orders
                .AsNoTracking()
                .Include(o => o.OrderItems).ThenInclude(i => i.Product)
                .Where(o => o.Table.Region.BranchId == restaurantId)
                .ToListAsync(cancellationToken);
            List<Table> tables = await _db.Tables
                .AsNoTracking()
                .Where(t => t.Region.BranchId == restaurantId)
                .ToListAsync(cancellationToken);

            decimal totalRevenue = orders.Sum(o => o.TotalPrice);
            int totalOrders = orders.Count;
            decimal avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            int occupiedTables = tables.Count(t => t.Status == TableStatus.Occupied);
            int totalTables = tables.Count;

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
