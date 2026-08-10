using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetMyCurrentShift;

public class GetMyCurrentShiftQueryHandler : IRequestHandler<GetMyCurrentShiftQuery, Result<ShiftDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetMyCurrentShiftQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Result<ShiftDto>> Handle(GetMyCurrentShiftQuery request, CancellationToken cancellationToken)
    {
        Guid restaurantId = _currentUser.BranchId;

        var openShifts = await _uow.Shift.GetAllAsync(
            s => s.BranchId == restaurantId && s.OpenedByUserId == _currentUser.UserId && s.Status == ShiftStatus.Open,
            false,
            "CashRegister");

        var shift = openShifts.FirstOrDefault();
        if (shift is null) return Result<ShiftDto>.Failure("Açık bir vardiyanız yok.");

        return Result<ShiftDto>.Success(shift.ToDto());
    }
}
