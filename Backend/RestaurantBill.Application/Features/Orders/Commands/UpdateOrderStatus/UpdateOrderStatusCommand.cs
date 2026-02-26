using MediatR;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus
{
    public class UpdateOrderStatusCommand : IRequest
    {
        public int OrderId { get; set; }
        public OrderStatus NewTableStatus { get; set; }
    }
}