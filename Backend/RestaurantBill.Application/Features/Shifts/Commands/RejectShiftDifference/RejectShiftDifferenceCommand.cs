using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.RejectShiftDifference;

public class RejectShiftDifferenceCommand : IRequest<Result>
{
    public Guid ShiftId { get; set; }
    public string? Note { get; set; }
}
