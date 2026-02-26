using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Orders.Queries.GetAllOrders
{
    public class GetAllOrdersQuery : IRequest<List<OrderDto>> 
    {
    }
}