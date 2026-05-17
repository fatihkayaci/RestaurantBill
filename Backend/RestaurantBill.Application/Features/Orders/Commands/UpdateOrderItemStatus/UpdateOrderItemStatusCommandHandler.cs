using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemStatus
{
    public class UpdateOrderItemStatusCommandHandler : IRequestHandler<UpdateOrderItemStatusCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly ITableNotificationService _tableNotificationService;

        public UpdateOrderItemStatusCommandHandler(IUnitOfWork uow, ITableNotificationService tableNotificationService)
        {
            _uow = uow;
            _tableNotificationService = tableNotificationService;
        }

        public async Task Handle(UpdateOrderItemStatusCommand request, CancellationToken cancellationToken)
        {
            if (!Enum.IsDefined(typeof(OrderItemStatus), request.Status))
                throw new BusinessException("Geçersiz ürün durumu.");

            var order = await _uow.Order.GetByIdAsync(request.OrderId, true, o => o.OrderItems);
            Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

            var item = order.OrderItems.FirstOrDefault(x => x.Id == request.OrderItemId);
            Guard.AgainstNull(item, "Böyle bir sipariş kalemi bulunamadı.");

            item.Status = (OrderItemStatus)request.Status;

            await _uow.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendOrderUpdatedAsync(order.TableId);
        }
    }
}
