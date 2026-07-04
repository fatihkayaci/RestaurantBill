using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using MediatR;

namespace RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder
{
    public class AddProductToOrderCommandHandler : IRequestHandler<AddProductToOrderCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly ITableNotificationService _tableNotificationService;

        public AddProductToOrderCommandHandler(IUnitOfWork uow, ITableNotificationService tableNotificationService)
        {
            _uow = uow;
            _tableNotificationService = tableNotificationService;
        }

        public async Task Handle(AddProductToOrderCommand request, CancellationToken cancellationToken)
        {
            Order? order = await _uow.Order.GetByIdAsync(request.OrderId, true, o => o.OrderItems);
            Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

            foreach (var item in request.OrderItems)
            {
                Product? product = await _uow.Product.GetByIdAsync(item.ProductId);
                Guard.AgainstNull(product, "Böyle bir ürün bulunamadı.");

                order.AddItem(product, item.Quantity);
            }

            if (!string.IsNullOrWhiteSpace(request.Note))
                order.UpdateNote(request.Note);

            await _uow.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendOrderUpdatedAsync(order.TableId, order.TotalPrice);
        }
    }
}