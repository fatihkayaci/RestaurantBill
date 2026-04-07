using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus
{
    public class UpdateOrderStatusCommandHandler : IRequestHandler<UpdateOrderStatusCommand>
    {
        private readonly IUnitOfWork _uow;

        public UpdateOrderStatusCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task Handle(UpdateOrderStatusCommand request, CancellationToken cancellationToken)
        {
            if (request.OrderId <= 0)
                throw new BusinessException("Geçersiz sipariş ID.");

            if (!Enum.IsDefined(typeof(OrderStatus), request.Status))
                throw new BusinessException("Geçersiz sipariş durumu.");

            var newOrderStatus = (OrderStatus)request.Status;

            var order = await _uow.Order.GetByIdAsync(request.OrderId, true, o => o.OrderItems);
            Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

            order.Status = newOrderStatus;

            var (fromItemStatus, toItemStatus) = newOrderStatus switch
            {
                OrderStatus.Preparing => (OrderItemStatus.Pending,   OrderItemStatus.Preparing),
                OrderStatus.Ready     => (OrderItemStatus.Preparing, OrderItemStatus.Ready),
                OrderStatus.Served    => (OrderItemStatus.Ready,     OrderItemStatus.Delivered),
                _                     => ((OrderItemStatus?)null,    (OrderItemStatus?)null)
            };

            if (fromItemStatus.HasValue && toItemStatus.HasValue)
            {
                foreach (var item in order.OrderItems.Where(i => i.Status == fromItemStatus.Value))
                    item.Status = toItemStatus.Value;
            }

            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}