using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Tables.Commands.OpenTable
{
    public class OpenTableCommand : IRequest<int>, IIdempotent
    {
        public int TableId { get; set; }

        public string IdempotencyKey => $"open-table:{TableId}";
    }
}