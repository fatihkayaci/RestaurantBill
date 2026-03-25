using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Orders.Commands.CreateOrder
{
    // TODO: Artık IRequest<Guid> değil, IRequest<int> yapıyoruz!
    public class CreateOrderCommand : IRequest<OrderDto> 
    {
        public int TableId { get; set; }
    }
}