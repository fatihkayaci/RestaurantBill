using MediatR;

namespace RestaurantBill.Application.Features.Tables.Commands.ReservationTable
{
    public class ReservationTableCommand : IRequest
    {
        public int TableId { get; set; }
    }
}