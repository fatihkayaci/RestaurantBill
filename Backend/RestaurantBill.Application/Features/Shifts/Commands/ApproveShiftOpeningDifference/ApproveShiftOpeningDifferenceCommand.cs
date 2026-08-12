using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.ApproveShiftOpeningDifference;

public class ApproveShiftOpeningDifferenceCommand : IRequest<Result>
{
    public Guid ShiftId { get; set; }
}
