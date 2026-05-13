using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder
{
    public class AddProductToOrderCommand : IRequest, IIdempotent
    {
        public int OrderId { get; set; }
        public string Note { get; set; } = string.Empty;
        public ICollection<CreateOrderItemDto> OrderItems { get; set; } = new List<CreateOrderItemDto>();

        public string IdempotencyKey =>
            $"order:{OrderId}:{string.Join("_", OrderItems.OrderBy(x => x.ProductId).Select(x => $"{x.ProductId}-{x.Quantity}"))}";

    }
}