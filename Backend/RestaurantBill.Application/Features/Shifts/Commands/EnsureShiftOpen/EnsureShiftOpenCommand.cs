using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.EnsureShiftOpen;

public class EnsureShiftOpenCommand : IRequest<Result<ShiftDto>>
{
    public Guid CashRegisterId { get; set; }
}
