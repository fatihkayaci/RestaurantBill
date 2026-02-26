using MediatR;

namespace RestaurantBill.Application.Features.Orders.Commands.CloseOrder
{
    public class CloseOrderCommand : IRequest
    {
        public int OrderId { get; set; }
    }
}