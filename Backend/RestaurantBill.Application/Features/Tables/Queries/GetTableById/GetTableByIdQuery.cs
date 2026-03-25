using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Tables.Queries.GetTableById
{
    public class GetTableByIdQuery : IRequest<TableDto> 
    {
        public int TableId { get; set; }
    }
}