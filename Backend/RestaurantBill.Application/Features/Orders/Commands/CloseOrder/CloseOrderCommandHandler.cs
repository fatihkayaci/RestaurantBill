using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Common;
using MediatR;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Orders.Commands.CloseOrder
{
    public class CloseOrderCommandHandler : IRequestHandler<CloseOrderCommand>
    {
        private readonly IUnitOfWork _uow;

        public CloseOrderCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }
        /// <summary>
        /// Closes the order, marks it as Paid and sets the table status to Available.
        /// </summary>
        /// <exception cref="BusinessException">Thrown if order ID is zero or less, or if the order is not found.</exception>
        public async Task Handle(CloseOrderCommand request, CancellationToken cancellationToken)
        {         
            if (request.OrderId <= 0)
                throw new BusinessException("id 0 dan küçük veya eşit olamaz");
            
            var order = await _uow.Order.GetByIdAsync(request.OrderId, true);
            Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");
            var table = await _uow.Table.GetByIdAsync(order.TableId, true);
            Guard.AgainstNull(table, "Böyle bir Masa bulunamadı.");
            
            order.Status = OrderStatus.Paid;
            table.Status = TableStatus.Available;

            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}