using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Orders.Commands.CloseOrder
{
    public class DeleteCommand : IRequest, IIdempotent
    {
        public int OrderId { get; set; }

        public string IdempotencyKey => $"close-order:{OrderId}";
    }
}
