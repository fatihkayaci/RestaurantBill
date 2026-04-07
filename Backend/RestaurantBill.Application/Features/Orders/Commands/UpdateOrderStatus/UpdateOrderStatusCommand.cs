using MediatR;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus
{
    public class UpdateOrderStatusCommand : IRequest
    {
        public int OrderId { get; set; }
        public int Status { get; set; }
    }
}