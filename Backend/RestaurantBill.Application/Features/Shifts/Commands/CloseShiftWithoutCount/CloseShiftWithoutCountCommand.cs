using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.CloseShiftWithoutCount;

public class CloseShiftWithoutCountCommand : IRequest<Result>
{
    public Guid ShiftId { get; set; }
}
