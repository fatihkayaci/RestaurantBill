using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.Reports;
using RestaurantBill.Application.DTOs.Stats;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Reports.Queries.GetSalesReport;

public class GetSalesReportQueryHandler : IRequestHandler<GetSalesReportQuery, Result<SalesReportDto>>
{
    private record PaymentRow(DateTime CreatedAt, decimal TotalAmount, decimal Matrah, decimal TaxAmount, PaymentMethod PaymentMethod, Guid OrderId);

    private readonly IAppDbContext _db;
    private readonly IReportScopeResolver _scope;
    private readonly IBusinessDayResolver _businessDay;

    public GetSalesReportQueryHandler(IAppDbContext db, IReportScopeResolver scope, IBusinessDayResolver businessDay)
    {
        _db = db;
        _scope = scope;
        _businessDay = businessDay;
    }

    public async Task<Result<SalesReportDto>> Handle(GetSalesReportQuery request, CancellationToken cancellationToken)
    {
        DateOnly from = request.From;
        DateOnly to = request.To < request.From ? request.From : request.To;

        List<Branch> branches = await _scope.ResolveAsync(request.BranchId, cancellationToken);
        if (branches.Count == 0)
            return Result<SalesReportDto>.Success(new SalesReportDto());

        bool isSingleDay = from == to;
        int periodLengthDays = to.DayNumber - from.DayNumber + 1;

        decimal totalRevenue = 0, totalMatrah = 0, totalTax = 0;
        int totalTransactionCount = 0;
        Dictionary<PaymentMethod, (decimal Amount, int Count)> methodTotals = [];
        Dictionary<string, (decimal Total, Dictionary<Guid, decimal> ByBranch)> trendBuckets = [];
        Dictionary<(int DayOfWeek, int Hour), (decimal Amount, int Count)> heatmap = [];
        List<BranchSalesRowDto> branchRows = [];

        foreach (Branch branch in branches)
        {
            TimeZoneInfo timeZone = TimeZoneInfo.FindSystemTimeZoneById(branch.TimeZoneId);
            (DateTime fromUtc, DateTime toUtc) = _businessDay.ToUtcRange(branch, from, to);

            List<PaymentRow> rows = await _db.Payments
                .AsNoTracking()
                .Where(p => p.CashRegister.BranchId == branch.Id && p.CreatedAt >= fromUtc && p.CreatedAt < toUtc)
                .Select(p => new PaymentRow(p.CreatedAt, p.TotalAmount, p.Matrah, p.TaxAmount, p.PaymentMethod, p.OrderId))
                .ToListAsync(cancellationToken);

            decimal branchRevenue = rows.Sum(r => r.TotalAmount);
            int branchTransactionCount = rows.Select(r => r.OrderId).Distinct().Count();

            totalRevenue += branchRevenue;
            totalMatrah += rows.Sum(r => r.Matrah);
            totalTax += rows.Sum(r => r.TaxAmount);
            totalTransactionCount += branchTransactionCount;

            foreach (var group in rows.GroupBy(r => r.PaymentMethod))
            {
                var (amount, count) = methodTotals.GetValueOrDefault(group.Key);
                methodTotals[group.Key] = (amount + group.Sum(r => r.TotalAmount), count + group.Count());
            }

            foreach (PaymentRow row in rows)
            {
                DateTime local = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(row.CreatedAt, DateTimeKind.Utc), timeZone);

                string label = isSingleDay
                    ? local.Hour.ToString("D2")
                    : _businessDay.ResolveBusinessDay(branch, row.CreatedAt).ToString("yyyy-MM-dd");

                if (!trendBuckets.TryGetValue(label, out var bucket))
                {
                    bucket = (0, []);
                    trendBuckets[label] = bucket;
                }
                bucket.ByBranch[branch.Id] = bucket.ByBranch.GetValueOrDefault(branch.Id) + row.TotalAmount;
                trendBuckets[label] = (bucket.Total + row.TotalAmount, bucket.ByBranch);

                int mondayBasedDow = ((int)local.DayOfWeek + 6) % 7;
                var heatmapKey = (mondayBasedDow, local.Hour);
                var (hAmount, hCount) = heatmap.GetValueOrDefault(heatmapKey);
                heatmap[heatmapKey] = (hAmount + row.TotalAmount, hCount + 1);
            }

            decimal previousRevenue = 0;
            if (branches.Count > 1)
            {
                DateOnly prevFrom = from.AddDays(-periodLengthDays);
                DateOnly prevTo = from.AddDays(-1);
                (DateTime prevFromUtc, DateTime prevToUtc) = _businessDay.ToUtcRange(branch, prevFrom, prevTo);
                previousRevenue = await _db.Payments
                    .AsNoTracking()
                    .Where(p => p.CashRegister.BranchId == branch.Id && p.CreatedAt >= prevFromUtc && p.CreatedAt < prevToUtc)
                    .SumAsync(p => (decimal?)p.TotalAmount, cancellationToken) ?? 0;

                branchRows.Add(new BranchSalesRowDto
                {
                    BranchId = branch.Id,
                    BranchName = branch.BranchName,
                    Revenue = branchRevenue,
                    TransactionCount = branchTransactionCount,
                    AvgBasket = branchTransactionCount > 0 ? branchRevenue / branchTransactionCount : 0,
                    RevenueChangePercent = PercentChange(branchRevenue, previousRevenue)
                });
            }
        }

        List<SalesTrendPointDto> trend = trendBuckets
            .Select(kv => new SalesTrendPointDto { Label = kv.Key, Total = kv.Value.Total, ByBranch = kv.Value.ByBranch })
            .OrderBy(p => p.Label, StringComparer.Ordinal)
            .ToList();

        List<PaymentMethodBreakdownDto> paymentMethods = methodTotals
            .Select(kv => new PaymentMethodBreakdownDto
            {
                Method = kv.Key,
                Amount = kv.Value.Amount,
                Percent = totalRevenue > 0 ? Math.Round(kv.Value.Amount / totalRevenue * 100, 1) : 0
            })
            .OrderByDescending(p => p.Amount)
            .ToList();

        List<SalesHeatmapPointDto> heatmapPoints = heatmap
            .Select(kv => new SalesHeatmapPointDto { DayOfWeek = kv.Key.DayOfWeek, Hour = kv.Key.Hour, Amount = kv.Value.Amount, Count = kv.Value.Count })
            .ToList();

        return Result<SalesReportDto>.Success(new SalesReportDto
        {
            TotalRevenue = totalRevenue,
            TotalMatrah = totalMatrah,
            TotalTax = totalTax,
            TransactionCount = totalTransactionCount,
            AvgBasket = totalTransactionCount > 0 ? totalRevenue / totalTransactionCount : 0,
            Trend = trend,
            PaymentMethods = paymentMethods,
            Heatmap = heatmapPoints,
            BranchComparison = branchRows.OrderByDescending(b => b.Revenue).ToList()
        });
    }

    private static decimal PercentChange(decimal current, decimal previous)
    {
        if (previous == 0) return current == 0 ? 0 : 100;
        return Math.Round((current - previous) / previous * 100, 1);
    }
}
