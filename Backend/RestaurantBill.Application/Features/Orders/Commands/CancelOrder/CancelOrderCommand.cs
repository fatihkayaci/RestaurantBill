using MediatR;

namespace RestaurantBill.Application.Features.Orders.Commands.CancelOrder
{
    public class CancelOrderCommand : IRequest
    {
        public int OrderId { get; set; }
    }
}