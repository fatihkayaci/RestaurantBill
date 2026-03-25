using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder
{
    public class AddProductToOrderCommand : IRequest
    {
        public int OrderId { get; set; }
        public string Note { get; set; } = string.Empty;
        public ICollection<CreateOrderItemDto> OrderItems { get; set; } = new List<CreateOrderItemDto>();
    }
}