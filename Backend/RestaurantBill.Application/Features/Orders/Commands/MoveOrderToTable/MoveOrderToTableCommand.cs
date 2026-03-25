using MediatR;

namespace RestaurantBill.Application.Features.Orders.Commands.MoveOrderToTable
{
    // Artık IRequest<Guid> değil, IRequest<int> yapıyoruz!
    public class MoveOrderToTableCommand : IRequest
    {
        public int TableId { get; set; }
        public int OrderId { get; set; }

    }
}