using MediatR;
using RestaurantBill.Application.DTOs; // Kendi DTO namespace'ini yazarsın

namespace RestaurantBill.Application.Features.Orders.Queries.GetOrderById
{
    public class GetOrderByIdQuery : IRequest<OrderDto> 
    {
        public int OrderId { get; set; }
    }
}