using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Queries.GetTableById
{
    public class GetTableByIdQuery : IRequest<Result<TableDto>> 
    {
        public Guid TableId { get; set; }
    }
}