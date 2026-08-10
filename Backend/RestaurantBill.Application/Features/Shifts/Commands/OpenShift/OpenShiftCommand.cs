using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.OpenShift;

public class OpenShiftCommand : IRequest<Result>
{
    public Guid CashRegisterId { get; set; }
    public decimal OpeningBalance { get; set; }
}
