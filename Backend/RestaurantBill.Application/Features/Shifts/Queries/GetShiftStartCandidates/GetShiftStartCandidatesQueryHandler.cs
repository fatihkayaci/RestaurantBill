using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetShiftStartCandidates;

public class GetShiftStartCandidatesQueryHandler : IRequestHandler<GetShiftStartCandidatesQuery, Result<List<ShiftStartCandidateDto>>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetShiftStartCandidatesQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Result<List<ShiftStartCandidateDto>>> Handle(GetShiftStartCandidatesQuery request, CancellationToken cancellationToken)
    {
        Guid restaurantId = _currentUser.BranchId;
        if (restaurantId == Guid.Empty) return Result<List<ShiftStartCandidateDto>>.Failure("ID değeri 0 veya negatif olamaz.");

        var registers = await _uow.CashRegister.GetAllAsync(r => r.BranchId == restaurantId && r.Status == CashRegisterStatus.Open);
        var shifts = await _uow.Shift.GetAllAsync(s => s.BranchId == restaurantId);

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
                ExpectedOpeningBalance = shifts
                    .Where(s => s.CashRegisterId == r.Id && s.Status == ShiftStatus.Closed)
                    .OrderByDescending(s => s.ClosedAt)
                    .Select(s => s.CountedClosingBalance ?? 0)
                    .FirstOrDefault()
            })
            .OrderBy(c => c.CashRegisterName)
            .ToList();

        return Result<List<ShiftStartCandidateDto>>.Success(candidates);
    } 
}
