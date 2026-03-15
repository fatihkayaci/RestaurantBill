using MediatR;

namespace RestaurantBill.Application.Features.Tables.Commands.OpenTable
{
    public class OpenTableCommand : IRequest
    {
        public int TableId { get; set; }
    }
}