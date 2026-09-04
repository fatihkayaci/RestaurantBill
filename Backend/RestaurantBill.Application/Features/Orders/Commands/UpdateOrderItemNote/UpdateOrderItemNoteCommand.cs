using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemNote
{
    public class UpdateOrderItemNoteCommand : IRequest<Result>
    {
        public Guid OrderId { get; set; }
        public Guid OrderItemId { get; set; }
        public string? Note { get; set; }
    }
}
