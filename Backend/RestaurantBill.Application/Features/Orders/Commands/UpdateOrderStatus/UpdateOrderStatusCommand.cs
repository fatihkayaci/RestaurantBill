using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus
{
    public class UpdateOrderStatusCommand : IRequest<Result>
    {
        public int OrderId { get; set; }
        public int Status { get; set; }
    }
}