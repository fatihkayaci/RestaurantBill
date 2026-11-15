using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.RemoveProductFromOrder
{
    public class RemoveProductFromOrderCommand : IRequest<Result>
    {
        public Guid OrderId { get; set; }
        public Guid ProductId { get; set; }
        /// <summary>Doluysa satır Id ile çıkarılır (menü satırları için zorunlu; ProductId yok sayılır).</summary>
        public Guid? OrderItemId { get; set; }
    }
}