

using MediatR;

namespace RestaurantBill.Application.Features.Orders.Commands.CreateOrder
{
    // Artık IRequest<Guid> değil, IRequest<int> yapıyoruz!
    public class AddProductToOrderCommand : IRequest
    {
        public int OrderId { get; set; }
        public int Quantity { get; set; }
        public int ProductId { get; set; }
    }
}