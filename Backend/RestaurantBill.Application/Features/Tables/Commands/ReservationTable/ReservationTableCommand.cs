using MediatR;

namespace RestaurantBill.Application.Features.Tables.Commands.ReservationTable
{
    public class ReservationTableCommand : IRequest
    {
        public int TableId { get; set; }
        public string GuestName { get; set; } = string.Empty;
        public string Contact { get; set; } = string.Empty;
        public string ReservationTime { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
    }
}
