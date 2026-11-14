using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemQuantity
{
    public class UpdateOrderItemQuantityCommand : IRequest<Result>
    {
        public Guid OrderId { get; set; }
        public Guid ProductId { get; set; }
        /// <summary>Doluysa satır Id ile güncellenir (menü satırları için zorunlu; ProductId yok sayılır).</summary>
        public Guid? OrderItemId { get; set; }
        public int Quantity { get; set; }
    }
}