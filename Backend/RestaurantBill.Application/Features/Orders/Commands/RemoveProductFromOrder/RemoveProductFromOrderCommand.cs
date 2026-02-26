using MediatR;

namespace RestaurantBill.Application.Features.Orders.Commands.RemoveProductFromOrder
{
    public class RemoveProductFromOrderCommand : IRequest
    {
        public int OrderId { get; set; }
        public int ProductId { get; set; }
        public int QuantityToRemove { get; set; }
    }
}