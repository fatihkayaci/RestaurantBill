using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.OpenTable
{
    public class OpenTableCommand : IRequest<Result<int>>
    {
        public int TableId { get; set; }
    }
}
