using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Features.Orders.ItemsReady;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemsStatus;

public class UpdateOrderItemsStatusCommandHandler : IRequestHandler<UpdateOrderItemsStatusCommand, Result>
{
    private readonly IAppDbContext _db;
    private readonly ITableNotificationService _tableNotificationService;
    private readonly ICashierNotificationService _cashierNotificationService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ICourierNotificationService? _courierNotificationService;

    // Kurye bildirimi isteğe bağlıdır (DI verir; testler vermeden kurabilir): sipariş Hazır olunca atanmış kuryenin ekranı yenilenir.
    public UpdateOrderItemsStatusCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService,
        ICourierNotificationService? courierNotificationService = null)
    {
        _db = db;
        _tableNotificationService = tableNotificationService;
        _cashierNotificationService = cashierNotificationService;
        _currentUserService = currentUserService;
        _courierNotificationService = courierNotificationService;
    }

    public async Task<Result> Handle(UpdateOrderItemsStatusCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUserService, cancellationToken);

        Order? order = await _db.Orders
            .Include(o => o.OrderItems).ThenInclude(i => i.Product)
            .InBranches(branchIds).FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);
        if (order is null)
            return Result.Failure("Böyle bir sipariş bulunamadı.");

        StaffAccess access = await _db.GetStaffAccessAsync(_currentUserService, cancellationToken);
        string? accessError = await _db.CheckOrderAccessAsync(access, order, null, cancellationToken);
        if (accessError is not null)
            return Result.Failure(accessError);

        List<Guid> itemIds = request.OrderItemIds.Distinct().ToList();
        List<OrderItem> items = order.OrderItems.Where(i => itemIds.Contains(i.Id)).ToList();
        if (items.Count != itemIds.Count)
            return Result.Failure("Böyle bir sipariş kalemi bulunamadı.");

        // Tek ürün ucuyla aynı kural: kategori atanmış mutfak kendi kategorisi dışındaki bir ürüne dokunamaz.
        // Listede böyle bir ürün varsa istek bütünüyle reddedilir; hiçbir ürünün durumu değişmez.
        // Menü satırı gönderildiyse (garson "servis edildi") içindeki ürünlerin kategorileri denetlenir.
        IEnumerable<OrderItem> affected = items.SelectMany(i => i.IsSetMenu ? order.GetSetMenuComponents(i) : [i]);
        if (affected.Any(i => i.Product is null || !access.CanAccessCategory(i.Product.CategoryId)))
            return Result.Failure(StaffAccess.CategoryDeniedMessage);

        HashSet<Guid> notReadyBefore = ItemsReadyNotification.NotReadyItemIds(order);
        OrderItemStatus newStatus = (OrderItemStatus)request.Status;
        foreach (OrderItem item in items)
            order.UpdateItemStatus(item.Id, newStatus);

        DeliveryOrder? advancedDelivery = await _db.AdvanceDeliveryFromKitchenAsync(order, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        User? creator = await _db.Users.FirstOrDefaultAsync(u => u.Id == order.CreatedUser, cancellationToken);
        await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, order, creator?.FullName ?? string.Empty);
        await _db.SendItemsReadyAsync(_tableNotificationService, order, ItemsReadyNotification.NewlyReadyItemIds(order, notReadyBefore), cancellationToken);
        await _cashierNotificationService.NotifyDeliveryAdvancedAsync(advancedDelivery, _courierNotificationService);
        return Result.Success();
    }
}
