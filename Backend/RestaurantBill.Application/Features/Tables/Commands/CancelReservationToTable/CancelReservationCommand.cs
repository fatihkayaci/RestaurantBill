using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.CancelReservationToTable
{
    public class CancelReservationCommand : IRequest<Result>
    {
        public Guid TableId { get; set; }
    }
}
