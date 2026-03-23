using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Common;
using MediatR;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemQuantity
{
    public class UpdateOrderItemQuantityCommandHandler : IRequestHandler<UpdateOrderItemQuantityCommand>
    {
        private readonly IUnitOfWork _uow;

        public UpdateOrderItemQuantityCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }
        /// <summary>
        /// Updates the quantity of a specific item in the order and recalculates the total price.
        /// Only items with Pending status can be updated.
        /// </summary>
        /// <exception cref="BusinessException">Thrown if quantity is zero or less, order/item is not found, or item status is not Pending.</exception>
        public async Task Handle(UpdateOrderItemQuantityCommand request, CancellationToken cancellationToken)
        {
            if (request.Quantity <= 0)
                throw new BusinessException("Miktar 0'dan büyük olmalı!");

            var order = await _uow.Order.GetByIdAsync(request.OrderId, true, o => o.OrderItems);
            Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

            var existingItem = order.OrderItems.FirstOrDefault(x => x.ProductId == request.ProductId);
            Guard.AgainstNull(existingItem, "İptal etmek istediğiniz ürün zaten bu siparişte yok!");

            if (existingItem.Status != OrderItemStatus.Pending)
                throw new BusinessException("Sadece Garson onay kısmında güncellenebilir.");

            existingItem.Quantity = request.Quantity;
            order.TotalPrice = order.OrderItems.Sum(item => item.UnitPrice * item.Quantity);
            
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}