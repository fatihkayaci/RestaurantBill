using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.Reports;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Reports.Queries.GetTaxReport;

public class GetTaxReportQueryHandler : IRequestHandler<GetTaxReportQuery, Result<TaxReportDto>>
{
    private record TaxRow(decimal Matrah, decimal TaxAmount, decimal TotalAmount);

    private readonly IAppDbContext _db;
    private readonly IReportScopeResolver _scope;
    private readonly IBusinessDayResolver _businessDay;

    public GetTaxReportQueryHandler(IAppDbContext db, IReportScopeResolver scope, IBusinessDayResolver businessDay)
    {
        _db = db;
        _scope = scope;
        _businessDay = businessDay;
    }

    public async Task<Result<TaxReportDto>> Handle(GetTaxReportQuery request, CancellationToken cancellationToken)
    {
        DateOnly from = request.From;
        DateOnly to = request.To < request.From ? request.From : request.To;

        List<Branch> branches = await _scope.ResolveAsync(request.BranchId, cancellationToken);
        if (branches.Count == 0)
            return Result<TaxReportDto>.Success(new TaxReportDto());

        List<TaxRow> allRows = [];
        foreach (Branch branch in branches)
        {
            (DateTime fromUtc, DateTime toUtc) = _businessDay.ToUtcRange(branch, from, to);

            List<TaxRow> rows = await _db.Payments
                .AsNoTracking()
                .Where(p => p.CashRegister.BranchId == branch.Id && p.CreatedAt >= fromUtc && p.CreatedAt < toUtc)
                .Select(p => new TaxRow(p.Matrah, p.TaxAmount, p.TotalAmount))
                .ToListAsync(cancellationToken);
            allRows.AddRange(rows);
        }

        List<TaxRateRowDto> rates = allRows
            .GroupBy(r => r.Matrah > 0 ? Math.Round(r.TaxAmount / r.Matrah * 100, 0) : 0)
            .Select(g => new TaxRateRowDto
            {
                TaxRatePercent = g.Key,
                Matrah = g.Sum(r => r.Matrah),
                Tax = g.Sum(r => r.TaxAmount),
                Total = g.Sum(r => r.TotalAmount)
            })
            .OrderBy(r => r.TaxRatePercent)
            .ToList();

        return Result<TaxReportDto>.Success(new TaxReportDto
        {
            Rates = rates,
            TotalMatrah = allRows.Sum(r => r.Matrah),
            TotalTax = allRows.Sum(r => r.TaxAmount),
            TotalAmount = allRows.Sum(r => r.TotalAmount)
        });
    }
}
