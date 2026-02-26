using MediatR;

namespace RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder
{
    public class AddProductToOrderCommand : IRequest
    {
        public int OrderId { get; set; }
        public int Quantity { get; set; }
        public int ProductId { get; set; }
    }
}