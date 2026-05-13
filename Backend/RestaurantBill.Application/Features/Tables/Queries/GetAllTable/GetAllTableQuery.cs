using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Tables.Queries.GetAllTable
{
    public class GetAllTableQuery : IRequest<List<TableDto>>
    {
    }
}
