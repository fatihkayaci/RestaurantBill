using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToCashierQuery
{
    public class GetAllOrdersToCashierQuery : IRequest<List<OrderDto>>
    {
    }
}