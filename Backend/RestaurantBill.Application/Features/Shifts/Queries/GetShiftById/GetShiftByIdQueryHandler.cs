using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetShiftById;

public class GetShiftByIdQueryHandler : IRequestHandler<GetShiftByIdQuery, Result<ShiftDto>>
{
    private readonly IUnitOfWork _uow;

    public GetShiftByIdQueryHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<Result<ShiftDto>> Handle(GetShiftByIdQuery request, CancellationToken cancellationToken)
    {
        var shift = await _uow.Shift.GetByIdAsync(request.ShiftId, false, s => s.CashRegister);
        if (shift is null) return Result<ShiftDto>.Failure("Vardiya bulunamadı.");

        return Result<ShiftDto>.Success(shift.ToDto());
    }
}
