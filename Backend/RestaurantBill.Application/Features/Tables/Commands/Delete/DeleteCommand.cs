using MediatR;

namespace RestaurantBill.Application.Features.Tables.Commands.Delete
{
    public class DeleteCommand : IRequest
    {
        public int TableId { get; set; }
    }
}