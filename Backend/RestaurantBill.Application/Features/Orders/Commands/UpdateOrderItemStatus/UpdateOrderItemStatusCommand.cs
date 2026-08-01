using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemStatus
{
    public class UpdateOrderItemStatusCommand : IRequest<Result>
    {
        public Guid OrderId { get; set; }
        public Guid OrderItemId { get; set; }
        public int Status { get; set; }
    }
}
