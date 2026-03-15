using MediatR;

namespace RestaurantBill.Application.Features.Tables.Commands.CloseTable
{
    public class CloseTableCommand : IRequest
    {
        public int OrderId { get; set; }
        public int Quantity { get; set; }
        public int ProductId { get; set; }
    }
}