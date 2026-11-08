using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetShiftStartCandidates;

public class GetShiftStartCandidatesQueryHandler : IRequestHandler<GetShiftStartCandidatesQuery, Result<List<ShiftStartCandidateDto>>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetShiftStartCandidatesQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<List<ShiftStartCandidateDto>>> Handle(GetShiftStartCandidatesQuery request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await _db.GetWorkingBranchIdsAsync(_currentUser, cancellationToken);
        if (branchIds.Count == 0) return Result<List<ShiftStartCandidateDto>>.Failure("Geçersiz şube bilgisi.");

        var registers = await _db.CashRegisters
            .AsNoTracking()
            .InBranches(branchIds)
            .Where(r => r.Status == CashRegisterStatus.Open)
            .ToListAsync(cancellationToken);

        var openShiftByRegisterId = await _db.Shifts
            .AsNoTracking()
            .InBranches(branchIds)
            .Where(s => s.Status == ShiftStatus.Open)
            .ToDictionaryAsync(s => s.CashRegisterId, cancellationToken);

        List<Guid> ownerIds = openShiftByRegisterId.Values.Select(s => s.OpenedByUserId).Distinct().ToList();
        Dictionary<Guid, string> ownerNames = await _db.Users
            .AsNoTracking()
            .Where(u => ownerIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);

        // Kasa bazında en son kapanmış vardiyayı bulmak için (sayımı atlanmış mı diye bakmak
        // amacıyla) tüm kapalı vardiyaları çekip bellekte gruplamak, EF'in GroupBy+First
        // çevirisinin sağlayıcıya göre değişken olmasından daha güvenilir.
        List<Shift> closedShifts = await _db.Shifts
            .AsNoTracking()
            .InBranches(branchIds)
            .Where(s => s.Status == ShiftStatus.Closed)
            .OrderByDescending(s => s.ClosedAt)
            .ToListAsync(cancellationToken);
        Dictionary<Guid, Shift> lastClosedShiftByRegisterId = closedShifts
            .GroupBy(s => s.CashRegisterId)
            .ToDictionary(g => g.Key, g => g.First());

        bool canSeeExpected = _currentUser.CanSeeExpectedBalance();

        var candidates = registers
            .Select(r =>
            {
                openShiftByRegisterId.TryGetValue(r.Id, out Shift? openShift);
                lastClosedShiftByRegisterId.TryGetValue(r.Id, out Shift? lastClosedShift);
                return new ShiftStartCandidateDto
                {
                    CashRegisterId = r.Id,
                    CashRegisterName = r.Name,
                    ExpectedOpeningBalance = canSeeExpected ? r.Balance : null,
                    HasOpenShift = openShift is not null,
                    OpenShiftId = openShift?.Id,
                    OpenedAt = openShift?.OpenedAt,
                    OpenShiftOwnerName = openShift is null ? null : ownerNames.GetValueOrDefault(openShift.OpenedByUserId),
                    IsMine = openShift?.OpenedByUserId == _currentUser.UserId,
                    RequiresCount = openShift is null && lastClosedShift?.CountStatus == ShiftCountStatus.NotCounted
                };
            })
            .OrderBy(c => c.CashRegisterName)
            .ToList();

        return Result<List<ShiftStartCandidateDto>>.Success(candidates);
    }
}
