using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.RemoveProductFromOrder
{
    public class RemoveProductFromOrderCommand : IRequest<Result>
    {
        public Guid OrderId { get; set; }
        public Guid ProductId { get; set; }
    }
}