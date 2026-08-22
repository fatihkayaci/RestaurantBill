using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
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
        Guid restaurantId = _currentUser.BranchId;
        if (restaurantId == Guid.Empty) return Result<List<ShiftStartCandidateDto>>.Failure("Geçersiz şube bilgisi.");

        var registers = await _db.CashRegisters
            .AsNoTracking()
            .Where(r => r.BranchId == restaurantId && r.Status == CashRegisterStatus.Open)
            .ToListAsync(cancellationToken);
        var shifts = await _db.Shifts
            .AsNoTracking()
            .Where(s => s.BranchId == restaurantId)
            .ToListAsync(cancellationToken);

        bool userHasOpenShift = shifts.Any(s => s.OpenedByUserId == _currentUser.UserId && s.Status == ShiftStatus.Open);
        if (userHasOpenShift)
            return Result<List<ShiftStartCandidateDto>>.Success(new List<ShiftStartCandidateDto>());

        var openRegisterIds = shifts.Where(s => s.Status == ShiftStatus.Open).Select(s => s.CashRegisterId).ToHashSet();

        var candidates = registers
            .Where(r => !openRegisterIds.Contains(r.Id))
            .Select(r => new ShiftStartCandidateDto
            {
                CashRegisterId = r.Id,
                CashRegisterName = r.Name,
                ExpectedOpeningBalance = r.Balance
            })
            .OrderBy(c => c.CashRegisterName)
            .ToList();

        return Result<List<ShiftStartCandidateDto>>.Success(candidates);
    }
}
