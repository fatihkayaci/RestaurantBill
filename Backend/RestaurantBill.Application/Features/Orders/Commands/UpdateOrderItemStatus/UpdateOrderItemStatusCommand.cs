using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemStatus
{
    public class UpdateOrderItemStatusCommand : IRequest<Result>
    {
        public int OrderId { get; set; }
        public int OrderItemId { get; set; }
        public int Status { get; set; }
    }
}
