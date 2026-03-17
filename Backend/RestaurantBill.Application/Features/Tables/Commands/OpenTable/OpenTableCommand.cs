using MediatR;

namespace RestaurantBill.Application.Features.Tables.Commands.OpenTable
{
    public class OpenTableCommand : IRequest<int>
    {
        public int TableId { get; set; }
    }
}