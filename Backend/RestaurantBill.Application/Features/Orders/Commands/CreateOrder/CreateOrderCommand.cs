using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Orders.Commands.CreateOrder
{
    // TODO: Artık IRequest<Guid> değil, IRequest<int> yapıyoruz!
    public class CreateOrderCommand : IRequest<int> 
    {
        public int TableId { get; set; }
        public string Note { get; set; } = string.Empty;
        public List<OrderItemDto> OrderItems { get; set; } = new();
    }
}