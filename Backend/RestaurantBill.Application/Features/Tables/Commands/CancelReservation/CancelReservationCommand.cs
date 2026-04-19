using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Tables.Commands.CancelReservation
{
    public class CancelReservationCommand : IRequest, IIdempotent
    {
        public int TableId { get; set; }

        public string IdempotencyKey => $"cancel-reservation:{TableId}";
    }
}