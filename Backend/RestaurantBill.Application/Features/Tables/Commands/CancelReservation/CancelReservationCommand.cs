using MediatR;

namespace RestaurantBill.Application.Features.Tables.Commands.CancelReservation
{
    public class CancelReservationCommand : IRequest
    {
        public int OrderId { get; set; }
        public int Quantity { get; set; }
        public int ProductId { get; set; }
    }
}