using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Queries.GetAllTable
{
    public class GetAllTableQuery : IRequest<Result<List<TableDto>>>
    {
    }
}
