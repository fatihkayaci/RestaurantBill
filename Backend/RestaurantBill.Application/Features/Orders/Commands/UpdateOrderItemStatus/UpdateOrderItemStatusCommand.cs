using MediatR;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemStatus
{
    public class UpdateOrderItemStatusCommand : IRequest
    {
        public int OrderId { get; set; }
        public int OrderItemId { get; set; }
        public int Status { get; set; }
    }
}
