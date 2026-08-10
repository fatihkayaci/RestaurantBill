using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetCurrentShift;

public class GetCurrentShiftQueryHandler : IRequestHandler<GetCurrentShiftQuery, Result<ShiftDto>>
{
    private readonly IUnitOfWork _uow;

    public GetCurrentShiftQueryHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<Result<ShiftDto>> Handle(GetCurrentShiftQuery request, CancellationToken cancellationToken)
    {
        var shifts = await _uow.Shift.GetAllAsync(
            s => s.CashRegisterId == request.CashRegisterId && s.Status == ShiftStatus.Open,
            false,
            "CashRegister");

        var shift = shifts.FirstOrDefault();
        if (shift is null) return Result<ShiftDto>.Failure("Bu kasada açık bir vardiya yok.");

        return Result<ShiftDto>.Success(shift.ToDto());
    }
}
