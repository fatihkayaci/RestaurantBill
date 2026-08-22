using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.Stats;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Stats.Queries.GetOwnerDashboard
{
    public class GetOwnerDashboardQueryHandler : IRequestHandler<GetOwnerDashboardQuery, Result<OwnerDashboardDto>>
    {
        private record PaymentRow(Guid BranchId, DateTime CreatedAt, decimal TotalAmount, PaymentMethod PaymentMethod, Guid OrderId);
        private record TableRow(Guid BranchId, TableStatus Status);

        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetOwnerDashboardQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<OwnerDashboardDto>> Handle(GetOwnerDashboardQuery request, CancellationToken cancellationToken)
        {
            int trendDays = request.TrendDays is 7 or 30 or 90 ? request.TrendDays : 7;
            DateTime day = DateTime.SpecifyKind((request.Date ?? DateTime.UtcNow).Date, DateTimeKind.Utc);
            DateTime dayEnd = day.AddDays(1);
            DateTime prevDayStart = day.AddDays(-1);
            DateTime lastWeekStart = day.AddDays(-7);
            DateTime lastWeekEnd = day.AddDays(-6);
            DateTime trendStart = day.AddDays(-(trendDays - 1));
            DateTime queryFrom = trendStart < lastWeekStart ? trendStart : lastWeekStart;

            List<Branch> branches = await _db.Branches
                .AsNoTracking()
                .Where(b => b.Company.OwnerUserId == _currentUser.UserId)
                .OrderBy(b => b.CreatedAt)
                .ToListAsync(cancellationToken);

            if (branches.Count == 0)
                return Result<OwnerDashboardDto>.Success(new OwnerDashboardDto());

            List<Guid> branchIds = branches.Select(b => b.Id).ToList();

            List<Membership> memberships = await _db.Memberships
                .AsNoTracking()
                .Where(m => branchIds.Contains(m.BranchId))
                .ToListAsync(cancellationToken);
            Dictionary<Guid, Membership?> latestMembershipByBranch = memberships
                .GroupBy(m => m.BranchId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(m => m.EndDate).FirstOrDefault());

            HashSet<Guid> branchesWithOpenShift = (await _db.Shifts
                .AsNoTracking()
                .Where(s => branchIds.Contains(s.BranchId) && s.Status == ShiftStatus.Open)
                .Select(s => s.BranchId)
                .ToListAsync(cancellationToken))
                .ToHashSet();

            List<PaymentRow> payments = await _db.Payments
                .AsNoTracking()
                .Where(p => branchIds.Contains(p.CashRegister.BranchId) && p.CreatedAt >= queryFrom && p.CreatedAt < dayEnd)
                .Select(p => new PaymentRow(p.CashRegister.BranchId, p.CreatedAt, p.TotalAmount, p.PaymentMethod, p.OrderId))
                .ToListAsync(cancellationToken);

            List<TableRow> tables = await _db.Tables
                .AsNoTracking()
                .Where(t => branchIds.Contains(t.Region.BranchId))
                .Select(t => new TableRow(t.Region.BranchId, t.Status))
                .ToListAsync(cancellationToken);

            List<UserBranch> staff = await _db.UserBranches
                .AsNoTracking()
                .Where(s => branchIds.Contains(s.BranchId) && s.IsActive)
                .ToListAsync(cancellationToken);

            List<Guid> pendingOrderBranchIds = await _db.Orders
                .AsNoTracking()
                .Where(o => branchIds.Contains(o.Table.Region.BranchId) && o.Status >= OrderStatus.Pending && o.Status < OrderStatus.Paid)
                .Select(o => o.Table.Region.BranchId)
                .ToListAsync(cancellationToken);

            decimal RevenueFor(DateTime from, DateTime to, Guid? branchId = null) =>
                payments.Where(p => p.CreatedAt >= from && p.CreatedAt < to && (branchId == null || p.BranchId == branchId))
                    .Sum(p => p.TotalAmount);

            int OrdersFor(DateTime from, DateTime to, Guid? branchId = null) =>
                payments.Where(p => p.CreatedAt >= from && p.CreatedAt < to && (branchId == null || p.BranchId == branchId))
                    .Select(p => p.OrderId)
                    .Distinct()
                    .Count();

            decimal PercentChange(decimal current, decimal previous)
            {
                if (previous == 0) return current == 0 ? 0 : 100;
                return Math.Round((current - previous) / previous * 100, 1);
            }

            decimal totalRevenueToday = RevenueFor(day, dayEnd);
            decimal totalRevenueYesterday = RevenueFor(prevDayStart, day);
            int totalOrdersToday = OrdersFor(day, dayEnd);
            int totalOrdersLastWeek = OrdersFor(lastWeekStart, lastWeekEnd);
            decimal totalRevenueLastWeek = RevenueFor(lastWeekStart, lastWeekEnd);
            decimal avgOrderToday = totalOrdersToday > 0 ? totalRevenueToday / totalOrdersToday : 0;
            decimal avgOrderLastWeek = totalOrdersLastWeek > 0 ? totalRevenueLastWeek / totalOrdersLastWeek : 0;

            List<RevenueTrendPointDto> trend = [];
            for (int i = trendDays - 1; i >= 0; i--)
            {
                DateTime d = day.AddDays(-i);
                DateTime dEnd = d.AddDays(1);
                List<PaymentRow> dayPayments = payments.Where(p => p.CreatedAt >= d && p.CreatedAt < dEnd).ToList();
                Dictionary<Guid, decimal> byBranch = dayPayments
                    .GroupBy(p => p.BranchId)
                    .ToDictionary(g => g.Key, g => g.Sum(p => p.TotalAmount));
                trend.Add(new RevenueTrendPointDto { Date = d, Total = dayPayments.Sum(p => p.TotalAmount), ByBranch = byBranch });
            }

            List<PaymentRow> todayPayments = payments.Where(p => p.CreatedAt >= day && p.CreatedAt < dayEnd).ToList();
            decimal todayTotal = todayPayments.Sum(p => p.TotalAmount);
            List<PaymentMethodBreakdownDto> paymentMethods = todayPayments
                .GroupBy(p => p.PaymentMethod)
                .Select(g => new PaymentMethodBreakdownDto
                {
                    Method = g.Key,
                    Amount = g.Sum(p => p.TotalAmount),
                    Percent = todayTotal > 0 ? Math.Round(g.Sum(p => p.TotalAmount) / todayTotal * 100, 1) : 0
                })
                .OrderByDescending(p => p.Amount)
                .ToList();

            List<BranchPerformanceDto> branchPerformance = branches.Select(b =>
            {
                Membership? membership = latestMembershipByBranch.GetValueOrDefault(b.Id);
                bool membershipActive = membership?.IsCurrentlyActive() ?? false;
                string status = !membershipActive ? "expired" : branchesWithOpenShift.Contains(b.Id) ? "open" : "closed";

                decimal revenue = RevenueFor(day, dayEnd, b.Id);
                decimal revenueYesterday = RevenueFor(prevDayStart, day, b.Id);
                int orders = OrdersFor(day, dayEnd, b.Id);
                int ordersLastWeek = OrdersFor(lastWeekStart, lastWeekEnd, b.Id);
                int totalTables = tables.Count(t => t.BranchId == b.Id);
                int openTables = tables.Count(t => t.BranchId == b.Id && t.Status == TableStatus.Occupied);

                return new BranchPerformanceDto
                {
                    BranchId = b.Id,
                    BranchName = b.BranchName,
                    City = b.City,
                    District = b.District,
                    Status = status,
                    TodayRevenue = revenue,
                    TodayRevenueChangePercent = PercentChange(revenue, revenueYesterday),
                    TodayOrders = orders,
                    TodayOrdersChangePercent = PercentChange(orders, ordersLastWeek),
                    AvgBasket = orders > 0 ? revenue / orders : 0,
                    StaffCount = staff.Count(s => s.BranchId == b.Id),
                    OpenTables = openTables,
                    TotalTables = totalTables,
                    PendingOrders = pendingOrderBranchIds.Count(id => id == b.Id),
                };
            }).ToList();

            int activeBranchCount = branches.Count(b => latestMembershipByBranch.GetValueOrDefault(b.Id)?.IsCurrentlyActive() ?? false);
            int membershipExpiringBranchCount = branches.Count(b =>
            {
                Membership? membership = latestMembershipByBranch.GetValueOrDefault(b.Id);
                return membership != null && membership.IsCurrentlyActive() && (membership.EndDate - DateTime.UtcNow).TotalDays <= 7;
            });

            return Result<OwnerDashboardDto>.Success(new OwnerDashboardDto
            {
                TotalRevenue = totalRevenueToday,
                TotalRevenueChangePercent = PercentChange(totalRevenueToday, totalRevenueYesterday),
                TotalOrders = totalOrdersToday,
                TotalOrdersChangePercent = PercentChange(totalOrdersToday, totalOrdersLastWeek),
                AvgOrderValue = avgOrderToday,
                AvgOrderValueChangePercent = PercentChange(avgOrderToday, avgOrderLastWeek),
                ActiveBranchCount = activeBranchCount,
                TotalBranchCount = branches.Count,
                MembershipExpiringBranchCount = membershipExpiringBranchCount,
                Trend = trend,
                PaymentMethods = paymentMethods,
                BranchPerformance = branchPerformance,
            });
        }
    }
}
