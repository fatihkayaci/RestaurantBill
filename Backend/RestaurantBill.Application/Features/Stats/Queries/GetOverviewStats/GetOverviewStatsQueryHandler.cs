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

            // Ödenen kalemler siparişten düşüldüğü için (Order.SettleItem) ciro sipariş tutarından değil,
            // raporlarla aynı kaynak olan ödeme kayıtlarından hesaplanır.
            var payments = await _db.Payments
                .AsNoTracking()
                .Where(p => p.CashRegister.BranchId == restaurantId)
                .Select(p => new { p.OrderId, p.TotalAmount })
                .ToListAsync(cancellationToken);
            List<Table> tables = await _db.Tables
                .AsNoTracking()
                .Where(t => t.Region.BranchId == restaurantId)
                .ToListAsync(cancellationToken);

            decimal totalRevenue = payments.Sum(p => p.TotalAmount);
            int totalOrders = payments.Select(p => p.OrderId).Distinct().Count();
            decimal avgOrderValue = totalOrders > 0 ? Math.Round(totalRevenue / totalOrders, 2) : 0;

            int occupiedTables = tables.Count(t => t.Status == TableStatus.Occupied);
            int totalTables = tables.Count;

            List<TopProductDto> topProducts = await _db.PaymentLineItems
                .AsNoTracking()
                .Where(l => l.Payment.CashRegister.BranchId == restaurantId)
                .GroupBy(l => l.ProductName)
                .Select(g => new TopProductDto
                {
                    Name = g.Key,
                    Sold = g.Sum(l => l.Quantity)
                })
                .OrderByDescending(p => p.Sold)
                .Take(5)
                .ToListAsync(cancellationToken);

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
