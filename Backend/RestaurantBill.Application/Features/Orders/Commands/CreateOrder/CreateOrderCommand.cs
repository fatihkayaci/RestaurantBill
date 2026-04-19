using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Orders.Commands.CreateOrder
{
    public class CreateOrderCommand : IRequest<OrderDto>, IIdempotent
    {
        public int TableId { get; set; }

        public string IdempotencyKey => $"create-order:table:{TableId}";
    }
}