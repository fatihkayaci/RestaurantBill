using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Tables.Commands.ReservationTable
{
    public class ReservationTableCommand : IRequest, IIdempotent
    {
        public int TableId { get; set; }

        public string IdempotencyKey => $"reservation-table:{TableId}";
    }
}