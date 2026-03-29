using MediatR;

namespace RestaurantBill.Application.Features.Orders.Commands.CloseOrder
{
    public class DeleteCommand : IRequest
    {
        public int OrderId { get; set; }
    }
}