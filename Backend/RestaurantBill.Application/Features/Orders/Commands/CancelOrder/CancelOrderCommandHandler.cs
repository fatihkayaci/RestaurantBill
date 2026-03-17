using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Common;

using MediatR;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Orders.Commands.CancelOrder
{
    public class CancelOrderCommandHandler : IRequestHandler<CancelOrderCommand>
    {
        private readonly IUnitOfWork _uow;

        public CancelOrderCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task Handle(CancelOrderCommand request, CancellationToken cancellationToken)
        {
            if (request.OrderId <= 0)
                throw new BusinessException("id 0 dan küçük veya eşit olamaz");
            
            var order = await _uow.Order.GetByIdAsync(request.OrderId, true);
            Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

            var table = await _uow.Table.GetByIdAsync(order.TableId, true);
            Guard.AgainstNull(table, "Bu siparişe ait bir masa bulunamadı.");

            order.Status = OrderStatus.Cancelled;
            table.Status = TableStatus.Available;
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}