using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Queries.GetActiveOrderByTableId
{
    public class GetActiveOrderByTableIdQuery : IRequest<Result<OrderDto>> 
    {
        public int TableId { get; set; }
    }
}