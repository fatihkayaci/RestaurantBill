using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.TakeOverShift;

public class TakeOverShiftCommand : IRequest<Result<ShiftDto>>
{
    public Guid CashRegisterId { get; set; }
    public decimal CountedBalance { get; set; }
    public string? Note { get; set; }
}
