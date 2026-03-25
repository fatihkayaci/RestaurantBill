using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Orders.Queries.GetActiveOrderByTableId
{
    public class GetActiveOrderByTableIdQuery : IRequest<OrderDto> 
    {
        public int TableId { get; set; }
    }
}