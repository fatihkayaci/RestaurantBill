using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.CloseShift;

public class CloseShiftCommand : IRequest<Result>
{
    public Guid ShiftId { get; set; }
    public decimal CountedClosingBalance { get; set; }
    public string? Note { get; set; }
}
