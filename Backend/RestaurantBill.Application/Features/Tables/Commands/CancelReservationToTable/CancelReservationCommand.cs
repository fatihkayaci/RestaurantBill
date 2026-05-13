using MediatR;

namespace RestaurantBill.Application.Features.Tables.Commands.CancelReservationToTable
{
    public class CancelReservationCommand : IRequest
    {
        public int TableId { get; set; }
    }
}
