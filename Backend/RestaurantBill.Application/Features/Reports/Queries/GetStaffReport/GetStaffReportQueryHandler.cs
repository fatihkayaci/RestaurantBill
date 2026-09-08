using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.Reports;
using RestaurantBill.Application.DTOs.Stats;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Reports.Queries.GetStaffReport;

public class GetStaffReportQueryHandler : IRequestHandler<GetStaffReportQuery, Result<StaffReportDto>>
{
    private record PayRow(Guid OrderId, Guid WaiterUserId, Guid? CashierUserId, decimal TotalAmount, PaymentMethod Method);

    private readonly IAppDbContext _db;
    private readonly IReportScopeResolver _scope;
    private readonly IBusinessDayResolver _businessDay;

    public GetStaffReportQueryHandler(IAppDbContext db, IReportScopeResolver scope, IBusinessDayResolver businessDay)
    {
        _db = db;
        _scope = scope;
        _businessDay = businessDay;
    }

    public async Task<Result<StaffReportDto>> Handle(GetStaffReportQuery request, CancellationToken cancellationToken)
    {
        DateOnly from = request.From;
        DateOnly to = request.To < request.From ? request.From : request.To;

        List<Branch> branches = await _scope.ResolveAsync(request.BranchId, cancellationToken);
        if (branches.Count == 0)
            return Result<StaffReportDto>.Success(new StaffReportDto());

        List<PayRow> allRows = [];
        foreach (Branch branch in branches)
        {
            (DateTime fromUtc, DateTime toUtc) = _businessDay.ToUtcRange(branch, from, to);

            List<PayRow> rows = await _db.Payments
                .AsNoTracking()
                .Where(p => p.CashRegister.BranchId == branch.Id && p.CreatedAt >= fromUtc && p.CreatedAt < toUtc)
                .Select(p => new PayRow(p.OrderId, p.Order.CreatedUser, p.UserId, p.TotalAmount, p.PaymentMethod))
                .ToListAsync(cancellationToken);

            allRows.AddRange(rows);
        }

        HashSet<Guid> userIds = allRows.Select(r => r.WaiterUserId)
            .Concat(allRows.Where(r => r.CashierUserId.HasValue).Select(r => r.CashierUserId!.Value))
            .ToHashSet();

        Dictionary<Guid, string> userNames = await _db.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName })
            .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);

        List<WaiterStaffRowDto> waiters = allRows
            .GroupBy(r => r.WaiterUserId)
            .Select(g =>
            {
                int orderCount = g.Select(r => r.OrderId).Distinct().Count();
                decimal revenue = g.Sum(r => r.TotalAmount);
                return new WaiterStaffRowDto
                {
                    UserId = g.Key,
                    UserName = userNames.GetValueOrDefault(g.Key, "Bilinmiyor"),
                    OrderCount = orderCount,
                    Revenue = revenue,
                    AvgBasket = orderCount > 0 ? revenue / orderCount : 0
                };
            })
            .OrderByDescending(w => w.Revenue)
            .ToList();

        List<CashierStaffRowDto> cashiers = allRows
            .Where(r => r.CashierUserId.HasValue)
            .GroupBy(r => r.CashierUserId!.Value)
            .Select(g => new CashierStaffRowDto
            {
                UserId = g.Key,
                UserName = userNames.GetValueOrDefault(g.Key, "Bilinmiyor"),
                TransactionCount = g.Count(),
                Revenue = g.Sum(r => r.TotalAmount),
                PaymentMethods = g.GroupBy(r => r.Method)
                    .Select(mg => new PaymentMethodBreakdownDto
                    {
                        Method = mg.Key,
                        Amount = mg.Sum(r => r.TotalAmount),
                        Percent = g.Sum(r => r.TotalAmount) > 0 ? Math.Round(mg.Sum(r => r.TotalAmount) / g.Sum(r => r.TotalAmount) * 100, 1) : 0
                    })
                    .OrderByDescending(m => m.Amount)
                    .ToList()
            })
            .OrderByDescending(c => c.Revenue)
            .ToList();

        return Result<StaffReportDto>.Success(new StaffReportDto { Waiters = waiters, Cashiers = cashiers });
    }
}
