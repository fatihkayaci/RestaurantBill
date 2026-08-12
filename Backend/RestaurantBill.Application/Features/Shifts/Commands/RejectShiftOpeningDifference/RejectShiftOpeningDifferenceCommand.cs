using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.RejectShiftOpeningDifference;

public class RejectShiftOpeningDifferenceCommand : IRequest<Result>
{
    public Guid ShiftId { get; set; }
    public string? Note { get; set; }
}
