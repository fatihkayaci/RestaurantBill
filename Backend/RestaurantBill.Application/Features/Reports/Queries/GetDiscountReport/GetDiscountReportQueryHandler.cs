using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.Reports;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Reports.Queries.GetDiscountReport;

public class GetDiscountReportQueryHandler : IRequestHandler<GetDiscountReportQuery, Result<DiscountReportDto>>
{
    private record DiscountRow(Guid? UserId, decimal TotalAmount, decimal DiscountAmount, string DiscountNote);
    private record CancelRow(Guid? OrderId, string ActorName, DateTime CancelledAt);

    private static readonly (decimal Min, decimal Max, string Label)[] Buckets =
    [
        (0, 10, "0-10"),
        (10, 25, "10-25"),
        (25, 50, "25-50"),
        (50, 100.01m, "50-100"),
    ];

    private readonly IAppDbContext _db;
    private readonly IReportScopeResolver _scope;
    private readonly IBusinessDayResolver _businessDay;

    public GetDiscountReportQueryHandler(IAppDbContext db, IReportScopeResolver scope, IBusinessDayResolver businessDay)
    {
        _db = db;
        _scope = scope;
        _businessDay = businessDay;
    }

    public async Task<Result<DiscountReportDto>> Handle(GetDiscountReportQuery request, CancellationToken cancellationToken)
    {
        DateOnly from = request.From;
        DateOnly to = request.To < request.From ? request.From : request.To;

        List<Branch> branches = await _scope.ResolveAsync(request.BranchId, cancellationToken);
        if (branches.Count == 0)
            return Result<DiscountReportDto>.Success(new DiscountReportDto());

        List<DiscountRow> allPayments = [];
        List<CancelRow> allCancellations = [];

        foreach (Branch branch in branches)
        {
            (DateTime fromUtc, DateTime toUtc) = _businessDay.ToUtcRange(branch, from, to);

            List<DiscountRow> payments = await _db.Payments
                .AsNoTracking()
                .Where(p => p.CashRegister.BranchId == branch.Id && p.CreatedAt >= fromUtc && p.CreatedAt < toUtc)
                .Select(p => new DiscountRow(p.UserId, p.TotalAmount, p.DiscountAmount, p.DiscountNote))
                .ToListAsync(cancellationToken);
            allPayments.AddRange(payments);

            List<CancelRow> cancellations = await _db.AuditLogs
                .AsNoTracking()
                .Where(a => a.BranchId == branch.Id && a.Action == "OrderCancelled" && a.CreatedAt >= fromUtc && a.CreatedAt < toUtc)
                .Select(a => new CancelRow(a.EntityId, a.ActorName, a.CreatedAt))
                .ToListAsync(cancellationToken);
            allCancellations.AddRange(cancellations);
        }

        decimal totalDiscount = allPayments.Sum(p => p.DiscountAmount);
        decimal grossRevenue = allPayments.Sum(p => p.TotalAmount + p.DiscountAmount);

        List<DiscountRow> discounted = allPayments.Where(p => p.DiscountAmount > 0).ToList();

        List<DiscountUserRowDto> userBreakdown = discounted
            .Where(p => p.UserId.HasValue)
            .GroupBy(p => p.UserId!.Value)
            .Select(g => new DiscountUserRowDto { UserId = g.Key, Count = g.Count(), TotalAmount = g.Sum(p => p.DiscountAmount) })
            .OrderByDescending(u => u.TotalAmount)
            .ToList();

        if (userBreakdown.Count > 0)
        {
            HashSet<Guid> userIds = userBreakdown.Select(u => u.UserId).ToHashSet();
            Dictionary<Guid, string> userNames = await _db.Users
                .AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FullName })
                .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);
            foreach (DiscountUserRowDto row in userBreakdown)
                row.UserName = userNames.GetValueOrDefault(row.UserId, "Bilinmiyor");
        }

        List<DiscountBucketDto> distribution = Buckets.Select(b =>
        {
            List<DiscountRow> inBucket = discounted.Where(p =>
            {
                decimal gross = p.TotalAmount + p.DiscountAmount;
                decimal percent = gross > 0 ? p.DiscountAmount / gross * 100 : 0;
                return percent >= b.Min && percent < b.Max;
            }).ToList();
            return new DiscountBucketDto { Label = b.Label, Count = inBucket.Count, TotalAmount = inBucket.Sum(p => p.DiscountAmount) };
        }).ToList();

        int noteFilledCount = discounted.Count(p => !string.IsNullOrWhiteSpace(p.DiscountNote));

        List<CancelledOrderRowDto> cancelledOrders = [];
        if (allCancellations.Count > 0)
        {
            List<Guid> orderIds = allCancellations.Where(c => c.OrderId.HasValue).Select(c => c.OrderId!.Value).Distinct().ToList();
            Dictionary<Guid, (string TableName, decimal Amount)> orderInfo = await _db.Orders
                .AsNoTracking()
                .Where(o => orderIds.Contains(o.Id))
                .Select(o => new { o.Id, o.Table.Name, o.TotalPrice })
                .ToDictionaryAsync(o => o.Id, o => (o.Name, o.TotalPrice), cancellationToken);

            cancelledOrders = allCancellations
                .Where(c => c.OrderId.HasValue)
                .Select(c =>
                {
                    (string TableName, decimal Amount) info = orderInfo.GetValueOrDefault(c.OrderId!.Value, ("—", 0m));
                    return new CancelledOrderRowDto { OrderId = c.OrderId!.Value, TableName = info.TableName, ActorName = c.ActorName, CancelledAt = c.CancelledAt, Amount = info.Amount };
                })
                .OrderByDescending(c => c.CancelledAt)
                .ToList();
        }

        return Result<DiscountReportDto>.Success(new DiscountReportDto
        {
            TotalDiscountAmount = totalDiscount,
            GrossRevenue = grossRevenue,
            DiscountToRevenuePercent = grossRevenue > 0 ? Math.Round(totalDiscount / grossRevenue * 100, 1) : 0,
            DiscountedPaymentCount = discounted.Count,
            NoteFilledPercent = discounted.Count > 0 ? Math.Round((decimal)noteFilledCount / discounted.Count * 100, 1) : 0,
            UserBreakdown = userBreakdown,
            PercentDistribution = distribution,
            CancelledOrders = cancelledOrders
        });
    }
}
