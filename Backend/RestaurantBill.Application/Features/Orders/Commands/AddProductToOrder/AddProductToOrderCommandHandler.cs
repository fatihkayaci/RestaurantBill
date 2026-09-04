using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder
{
    public class AddProductToOrderCommandHandler : IRequestHandler<AddProductToOrderCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICashierNotificationService _cashierNotificationService;
        private readonly ICurrentUserService _currentUserService;

        public AddProductToOrderCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService)
        {
            _db = db;
            _tableNotificationService = tableNotificationService;
            _cashierNotificationService = cashierNotificationService;
            _currentUserService = currentUserService;
        }

        public async Task<Result> Handle(AddProductToOrderCommand request, CancellationToken cancellationToken)
        {
            Order? order = await _db.Orders
                .Include(o => o.OrderItems)
                .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);
            if (order is null)
                return Result.Failure("Böyle bir sipariş bulunamadı.");

            foreach (var item in request.OrderItems)
            {
                Product? product = await _db.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId, cancellationToken);
                if (product is null)
                    return Result.Failure("Böyle bir ürün bulunamadı.");

                Category? category = await _db.Categories
                    .Include(c => c.Branch)
                    .FirstOrDefaultAsync(c => c.Id == product.CategoryId, cancellationToken);
                decimal taxRate = category?.GetEffectiveTaxRate() ?? 0m;

                order.AddItem(product, item.Quantity, taxRate, item.Note);
            }

            if (!string.IsNullOrWhiteSpace(request.Note))
                order.UpdateNote(request.Note);

            await _db.SaveChangesAsync(cancellationToken);

            User? creator = await _db.Users.FirstOrDefaultAsync(u => u.Id == order.CreatedUser, cancellationToken);
            await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, order.TableId, order.TotalPrice, creator?.FullName ?? string.Empty);
            await _cashierNotificationService.SendOrdersChangedAsync(_currentUserService.BranchId);
            return Result.Success();
        }
    }
}
