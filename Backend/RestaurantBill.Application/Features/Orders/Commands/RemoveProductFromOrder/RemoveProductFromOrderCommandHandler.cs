using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Common;
using MediatR;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Orders.Commands.RemoveProductFromOrder
{
    public class RemoveProductFromOrderCommandHandler : IRequestHandler<RemoveProductFromOrderCommand>
    {
        private readonly IUnitOfWork _uow;

        public RemoveProductFromOrderCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task Handle(RemoveProductFromOrderCommand request, CancellationToken cancellationToken)
        { 
            var order = await _uow.Order.GetByIdAsync(request.OrderId, true, o => o.OrderItems);
            Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

            var existingItem = order.OrderItems.FirstOrDefault(x => x.ProductId == request.ProductId);
            Guard.AgainstNull(existingItem, "İptal etmek istediğiniz ürün zaten bu siparişte yok!");

            if (request.QuantityToRemove >= existingItem.Quantity) order.OrderItems.Remove(existingItem);
            else existingItem.Quantity -= request.QuantityToRemove;

            order.TotalPrice = order.OrderItems.Sum(item => item.UnitPrice * item.Quantity);

            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}