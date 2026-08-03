using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.OpenTable
{
    public class OpenTableCommand : IRequest<Result<Guid>>
    {
        public Guid TableId { get; set; }
    }
}
