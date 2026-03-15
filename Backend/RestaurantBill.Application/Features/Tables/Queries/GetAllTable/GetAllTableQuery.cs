using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Tables.Queries.GetAll
{
    public class GetAllTableQuery : IRequest<List<TableDto>> 
    {
    }
}