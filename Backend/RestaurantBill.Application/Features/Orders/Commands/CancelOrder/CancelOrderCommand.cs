using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.CancelOrder
{
    public class CancelOrderCommand : IRequest<Result>, IIdempotent
    {
        public Guid OrderId { get; set; }

        public string IdempotencyKey => $"cancel-order:{OrderId}";
    }
}
