using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.CloseOrder
{
    public class DeleteCommand : IRequest<Result>, IIdempotent
    {
        public int OrderId { get; set; }

        public string IdempotencyKey => $"close-order:{OrderId}";
    }
}
