using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.AddSetMenuToOrder;

public class AddSetMenuToOrderCommandHandler : IRequestHandler<AddSetMenuToOrderCommand, Result<Guid>>
{
    private readonly IAppDbContext _db;
    private readonly ITableNotificationService _tableNotificationService;
    private readonly ICashierNotificationService _cashierNotificationService;
    private readonly ICurrentUserService _currentUserService;

    public AddSetMenuToOrderCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService)
    {
        _db = db;
        _tableNotificationService = tableNotificationService;
        _cashierNotificationService = cashierNotificationService;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Guid>> Handle(AddSetMenuToOrderCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUserService, cancellationToken);

        Order? order = await _db.Orders
            .Include(o => o.OrderItems)
            .InBranches(branchIds).FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);
        if (order is null)
            return Result<Guid>.Failure("Böyle bir sipariş bulunamadı.");

        // Ürün eklemeyle aynı kural: garson yalnızca erişebildiği masaya, sipariş alma yetkisiyle ekler.
        string? accessError = await _db.CheckOrderAccessAsync(_currentUserService, order, WaiterPermission.TakeOrders, cancellationToken);
        if (accessError is not null)
            return Result<Guid>.Failure(accessError);

        // Yola çıkmış paket siparişin hesabı büyürse kuryenin tahsilatı tutmaz ve kasada "Teslim al" durur.
        if (await _db.CheckDeliveryAcceptsItemsAsync(order, cancellationToken) is { } dispatched)
            return Result<Guid>.Failure(dispatched);

        // Menü, siparişle aynı şubede olmalı (Owner birden çok şubeye erişebilir). Şube siparişin kendisinden okunur:
        // paket siparişin masası yoktur, ürün eklemede olduğu gibi menü de eklenebilir.
        SetMenu? setMenu = await _db.SetMenus
            .Include(s => s.Branch)
            .Include(s => s.Category)
            .Include(s => s.Slots).ThenInclude(slot => slot.Options).ThenInclude(o => o.Product)
            .FirstOrDefaultAsync(s => s.Id == request.SetMenuId && s.BranchId == order.BranchId, cancellationToken);
        if (setMenu is null)
            return Result<Guid>.Failure("Böyle bir menü bulunamadı.");

        // Menünün gösterim kategorisinin oranı, yoksa şubenin oranı.
        decimal taxRate = setMenu.Category?.TaxRate ?? setMenu.Branch.TaxRate;
        Dictionary<Guid, Guid> selections = request.Selections.ToDictionary(s => s.SlotId, s => s.ProductId);

        OrderItem setMenuItem;
        try
        {
            setMenuItem = order.AddSetMenu(setMenu, selections, request.Quantity, taxRate, request.Note);
        }
        catch (DomainException ex)
        {
            return Result<Guid>.Failure(ex.Message);
        }

        await _db.SaveChangesAsync(cancellationToken);

        User? creator = await _db.Users.FirstOrDefaultAsync(u => u.Id == order.CreatedUser, cancellationToken);
        await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, order, creator?.FullName ?? string.Empty);
        await _cashierNotificationService.SendOrdersChangedAsync(_currentUserService.BranchId);
        return Result<Guid>.Success(setMenuItem.Id);
    }
}
