using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder
{
    public class AddProductToOrderCommandHandler : IRequestHandler<AddProductToOrderCommand, Result>
    {
        private readonly IUnitOfWork _uow;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICashierNotificationService _cashierNotificationService;
        private readonly ICurrentUserService _currentUserService;

        public AddProductToOrderCommandHandler(IUnitOfWork uow, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService)
        {
            _uow = uow;
            _tableNotificationService = tableNotificationService;
            _cashierNotificationService = cashierNotificationService;
            _currentUserService = currentUserService;
        }

        public async Task<Result> Handle(AddProductToOrderCommand request, CancellationToken cancellationToken)
        {
            Order? order = await _uow.Order.GetByIdAsync(request.OrderId, true, o => o.OrderItems);
            if (order is null)
                return Result.Failure("Böyle bir sipariş bulunamadı.");

            foreach (var item in request.OrderItems)
            {
                Product? product = await _uow.Product.GetByIdAsync(item.ProductId);
                if (product is null)
                    return Result.Failure("Böyle bir ürün bulunamadı.");

                order.AddItem(product, item.Quantity);
            }

            if (!string.IsNullOrWhiteSpace(request.Note))
                order.UpdateNote(request.Note);

            await _uow.SaveChangesAsync(cancellationToken);

            User? creator = await _uow.User.GetByIdAsync(order.CreatedUser);
            await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, order.TableId, order.TotalPrice, creator?.FullName ?? string.Empty);
            await _cashierNotificationService.SendOrdersChangedAsync(_currentUserService.BranchId);
            return Result.Success();
        }
    }
}