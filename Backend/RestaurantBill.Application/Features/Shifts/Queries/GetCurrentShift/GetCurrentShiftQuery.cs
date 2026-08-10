using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetCurrentShift;

public class GetCurrentShiftQuery : IRequest<Result<ShiftDto>>
{
    public Guid CashRegisterId { get; set; }
}
