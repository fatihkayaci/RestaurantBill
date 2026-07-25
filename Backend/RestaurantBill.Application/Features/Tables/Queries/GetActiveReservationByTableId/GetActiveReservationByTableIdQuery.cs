using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Queries.GetActiveReservationByTableId
{
    public class GetActiveReservationByTableIdQuery : IRequest<Result<ReservationDto>>
    {
        public int TableId { get; set; }
    }
}
