using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Features.Orders.Commands.AddSetMenuToOrder;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands;

// Siparişe ürün ve menü ekleyen uçların (add-product, add-set-menu, add-lines) ortak adımları. Hiçbiri kaydetmez;
// çağıran tek SaveChanges yapar.
public static class OrderLineAdding
{
    public const string OrderNotFoundMessage = "Böyle bir sipariş bulunamadı.";
    public const string ProductNotFoundMessage = "Böyle bir ürün bulunamadı.";
    public const string SetMenuNotFoundMessage = "Böyle bir menü bulunamadı.";

    /// <summary>
    /// Siparişi kalemleriyle (izlenerek) yükler ve ekleme kurallarını denetler: kullanıcının şubesinde olmalı, garson
    /// yalnızca erişebildiği masaya sipariş alma yetkisiyle ekler, yola çıkmış paket siparişe eklenmez.
    /// </summary>
    public static async Task<Result<Order>> LoadOrderForAddingAsync(
        IAppDbContext db, ICurrentUserService currentUser, IReadOnlyCollection<Guid> branchIds, Guid orderId, CancellationToken cancellationToken)
    {
        Order? order = await db.Orders
            .Include(o => o.OrderItems)
            .InBranches(branchIds).FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);
        if (order is null)
            return Result<Order>.Failure(OrderNotFoundMessage);

        string? accessError = await db.CheckOrderAccessAsync(currentUser, order, WaiterPermission.TakeOrders, cancellationToken);
        if (accessError is not null)
            return Result<Order>.Failure(accessError);

        // Yola çıkmış paket siparişin hesabı büyürse kuryenin tahsilatı tutmaz ve kasada "Teslim al" durur.
        if (await db.CheckDeliveryAcceptsItemsAsync(order, cancellationToken) is { } dispatched)
            return Result<Order>.Failure(dispatched);

        return Result<Order>.Success(order);
    }

    /// <summary>Ürünü siparişe ekler (aynı ürün, not ve fiyattaki bekleyen satırla birleşir). Başarısızsa hata metni döner.</summary>
    public static async Task<string?> AddProductAsync(
        IAppDbContext db, Order order, IReadOnlyCollection<Guid> branchIds, CreateOrderItemDto item, CancellationToken cancellationToken)
    {
        Product? product = await db.Products.InBranches(branchIds).FirstOrDefaultAsync(p => p.Id == item.ProductId, cancellationToken);
        if (product is null)
            return ProductNotFoundMessage;

        // Kategori şubesiyle yüklenince ürünün Category gezinmesi de dolar.
        await db.Categories
            .Include(c => c.Branch)
            .FirstOrDefaultAsync(c => c.Id == product.CategoryId, cancellationToken);

        try
        {
            // Ürüne özel oran > kategori oranı > şube oranı.
            order.AddItem(product, item.Quantity, product.GetEffectiveTaxRate(), item.Note);
        }
        catch (DomainException ex)
        {
            return ex.Message;
        }
        return null;
    }

    /// <summary>
    /// Menüyü siparişe tek satır olarak ekler; fiyat sunucuda hesaplanır. Seçim gönderilmeyen bölümde varsayılan seçenek
    /// kullanılır. Başarılıysa menü satırını döner.
    /// </summary>
    public static async Task<Result<OrderItem>> AddSetMenuAsync(
        IAppDbContext db, Order order, Guid setMenuId, int quantity, string? note, IEnumerable<SetMenuSelectionInput> selections,
        CancellationToken cancellationToken)
    {
        // Menü, siparişle aynı şubede olmalı (Owner birden çok şubeye erişebilir). Şube siparişin kendisinden okunur:
        // paket siparişin masası yoktur, ürün eklemede olduğu gibi menü de eklenebilir.
        SetMenu? setMenu = await db.SetMenus
            .Include(s => s.Branch)
            .Include(s => s.Category)
            .Include(s => s.Slots).ThenInclude(slot => slot.Options).ThenInclude(o => o.Product)
            .FirstOrDefaultAsync(s => s.Id == setMenuId && s.BranchId == order.BranchId, cancellationToken);
        if (setMenu is null)
            return Result<OrderItem>.Failure(SetMenuNotFoundMessage);

        // Menünün gösterim kategorisinin oranı, yoksa şubenin oranı.
        decimal taxRate = setMenu.Category?.TaxRate ?? setMenu.Branch.TaxRate;
        Dictionary<Guid, Guid> selectionMap = selections.ToDictionary(s => s.SlotId, s => s.ProductId);

        try
        {
            return Result<OrderItem>.Success(order.AddSetMenu(setMenu, selectionMap, quantity, taxRate, note));
        }
        catch (DomainException ex)
        {
            return Result<OrderItem>.Failure(ex.Message);
        }
    }

    /// <summary>Kayıttan sonra masa (garson ekranları) ve kasa/mutfak listelerine tek bildirim.</summary>
    public static async Task NotifyOrderChangedAsync(
        IAppDbContext db, ITableNotificationService tableNotifications, ICashierNotificationService cashierNotifications,
        ICurrentUserService currentUser, Order order, CancellationToken cancellationToken)
    {
        User? creator = await db.Users.FirstOrDefaultAsync(u => u.Id == order.CreatedUser, cancellationToken);
        await tableNotifications.SendOrderUpdatedAsync(currentUser.BranchId, order, creator?.FullName ?? string.Empty);
        await cashierNotifications.SendOrdersChangedAsync(currentUser.BranchId);
    }
}
