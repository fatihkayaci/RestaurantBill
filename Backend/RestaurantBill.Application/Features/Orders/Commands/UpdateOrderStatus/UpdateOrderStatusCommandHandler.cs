using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus
{
    public class UpdateOrderStatusCommandHandler : IRequestHandler<UpdateOrderStatusCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICashierNotificationService _cashierNotificationService;

        public UpdateOrderStatusCommandHandler(IUnitOfWork uow, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService)
        {
            _uow = uow;
            _tableNotificationService = tableNotificationService;
            _cashierNotificationService = cashierNotificationService;
        }

        public async Task Handle(UpdateOrderStatusCommand request, CancellationToken cancellationToken)
        {
            Order? order = await _uow.Order.GetByIdAsync(request.OrderId, true, o => o.OrderItems);
            Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

            OrderStatus newStatus = (OrderStatus)request.Status;
            order.UpdateStatus(newStatus);

            await _uow.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendOrderUpdatedAsync(order.TableId);

            if (newStatus == OrderStatus.Served)
                await _cashierNotificationService.SendOrderServedAsync();
        }
    }
}