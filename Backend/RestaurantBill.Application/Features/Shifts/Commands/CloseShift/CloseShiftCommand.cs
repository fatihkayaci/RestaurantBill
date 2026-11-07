using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.CloseShift;

public class CloseShiftCommand : IRequest<Result<ShiftDto>>
{
    public Guid ShiftId { get; set; }
    public decimal CountedClosingBalance { get; set; }
    public string? Note { get; set; }
}
