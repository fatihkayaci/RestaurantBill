using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.Reports;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Reports.Queries.GetShiftReport;

public class GetShiftReportQueryHandler : IRequestHandler<GetShiftReportQuery, Result<ShiftReportDto>>
{
    private readonly IAppDbContext _db;
    private readonly IReportScopeResolver _scope;
    private readonly IBusinessDayResolver _businessDay;

    public GetShiftReportQueryHandler(IAppDbContext db, IReportScopeResolver scope, IBusinessDayResolver businessDay)
    {
        _db = db;
        _scope = scope;
        _businessDay = businessDay;
    }

    public async Task<Result<ShiftReportDto>> Handle(GetShiftReportQuery request, CancellationToken cancellationToken)
    {
        DateOnly from = request.From;
        DateOnly to = request.To < request.From ? request.From : request.To;

        List<Branch> branches = await _scope.ResolveAsync(request.BranchId, cancellationToken);
        if (branches.Count == 0)
            return Result<ShiftReportDto>.Success(new ShiftReportDto());

        List<Shift> allShifts = [];
        List<BranchShiftSummaryRowDto> branchSummaries = [];

        foreach (Branch branch in branches)
        {
            (DateTime fromUtc, DateTime toUtc) = _businessDay.ToUtcRange(branch, from, to);

            List<Shift> shifts = await _db.Shifts
                .AsNoTracking()
                .Include(s => s.CashRegister)
                .Where(s => s.BranchId == branch.Id && s.OpenedAt >= fromUtc && s.OpenedAt < toUtc)
                .OrderByDescending(s => s.OpenedAt)
                .ToListAsync(cancellationToken);

            allShifts.AddRange(shifts);

            if (branches.Count > 1)
            {
                branchSummaries.Add(new BranchShiftSummaryRowDto
                {
                    BranchId = branch.Id,
                    BranchName = branch.BranchName,
                    ShiftCount = shifts.Count,
                    TotalDifference = shifts.Sum(s => s.Difference ?? 0),
                    UncountedCount = shifts.Count(s => s.CountStatus == ShiftCountStatus.NotCounted),
                    AutoClosedCount = shifts.Count(s => s.ClosedBySystem)
                });
            }
        }

        bool RequiresReview(Shift s) =>
            (s.OpeningDifference != 0 && s.OpeningDifferenceReviewStatus == DifferenceReviewStatus.Pending) ||
            (s.Status == ShiftStatus.Closed && s.Difference is not null and not 0 && s.ClosingDifferenceReviewStatus == DifferenceReviewStatus.Pending);

        return Result<ShiftReportDto>.Success(new ShiftReportDto
        {
            TotalDifference = allShifts.Sum(s => s.Difference ?? 0),
            UncountedCount = allShifts.Count(s => s.CountStatus == ShiftCountStatus.NotCounted),
            AutoClosedCount = allShifts.Count(s => s.ClosedBySystem),
            PendingReviewCount = allShifts.Count(RequiresReview),
            Shifts = branches.Count == 1 ? allShifts.Select(s => s.ToDto()).ToList() : [],
            BranchSummaries = branchSummaries
        });
    }
}
