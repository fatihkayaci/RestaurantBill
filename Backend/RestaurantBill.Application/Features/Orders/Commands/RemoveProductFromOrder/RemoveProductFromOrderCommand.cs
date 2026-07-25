using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.RemoveProductFromOrder
{
    public class RemoveProductFromOrderCommand : IRequest<Result>
    {
        public int OrderId { get; set; }
        public int ProductId { get; set; }
    }
}