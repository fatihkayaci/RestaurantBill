using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetAllShifts;

public class GetAllShiftsQueryHandler : IRequestHandler<GetAllShiftsQuery, Result<List<ShiftDto>>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetAllShiftsQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Result<List<ShiftDto>>> Handle(GetAllShiftsQuery request, CancellationToken cancellationToken)
    {
        Guid restaurantId = _currentUser.BranchId;
        if (restaurantId == Guid.Empty) return Result<List<ShiftDto>>.Failure("ID değeri 0 veya negatif olamaz.");

        var entities = await _uow.Shift.GetAllAsync(
            s => s.BranchId == restaurantId && (request.CashRegisterId == null || s.CashRegisterId == request.CashRegisterId),
            false,
            "CashRegister");

        return Result<List<ShiftDto>>.Success(entities.OrderByDescending(s => s.OpenedAt).Select(s => s.ToDto()).ToList());
    }
}
