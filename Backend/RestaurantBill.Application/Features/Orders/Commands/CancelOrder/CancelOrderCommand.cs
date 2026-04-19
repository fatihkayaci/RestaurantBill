using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Orders.Commands.CancelOrder
{
    public class CancelOrderCommand : IRequest, IIdempotent
    {
        public int OrderId { get; set; }

        public string IdempotencyKey => $"cancel-order:{OrderId}";
    }
}