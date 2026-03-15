using MediatR;

namespace RestaurantBill.Application.Features.Tables.Commands.CancelTable
{
    public class CancelTableCommand : IRequest
    {
        public int OrderId { get; set; }
        public int Quantity { get; set; }
        public int ProductId { get; set; }
    }
}