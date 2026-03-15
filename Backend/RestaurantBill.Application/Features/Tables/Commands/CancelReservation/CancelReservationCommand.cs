using MediatR;

namespace RestaurantBill.Application.Features.Tables.Commands.CancelReservation
{
    public class CancelReservationCommand : IRequest
    {
        public int TableId { get; set; }
    }
}