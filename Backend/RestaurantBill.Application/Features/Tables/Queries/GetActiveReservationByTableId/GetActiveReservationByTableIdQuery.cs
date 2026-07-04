using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Tables.Queries.GetActiveReservationByTableId
{
    public class GetActiveReservationByTableIdQuery : IRequest<ReservationDto?>
    {
        public int TableId { get; set; }
    }
}
