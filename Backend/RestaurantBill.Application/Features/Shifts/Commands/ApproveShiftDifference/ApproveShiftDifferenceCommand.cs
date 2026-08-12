using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.ApproveShiftDifference;

public class ApproveShiftDifferenceCommand : IRequest<Result>
{
    public Guid ShiftId { get; set; }
}
