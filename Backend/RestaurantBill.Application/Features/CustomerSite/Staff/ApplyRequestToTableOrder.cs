using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CustomerSite.Staff;

/// <summary>Masanın açık siparişi; masa bu işlemde açıldıysa TableOpened true (masa durumu bildirimi gerekir).</summary>
public sealed record TableOrderTarget(Table Table, Order Order, bool TableOpened)
{
    public Guid BranchId => Table.Region.BranchId;
}

// Müşteri talebini (QR siparişi ya da rezervasyon ön siparişi) masanın siparişine yazan ortak adım. QR onayı ve
// rezervasyonun "Geldi" / "Mutfağa şimdi gönder" uçları bunu kullanır. Kaydetmez; çağıran SaveChanges yapar.
public static class ApplyRequestToTableOrder
{
    public const string PreOrderManagedByReservationMessage = "Bu bir rezervasyon ön siparişi; Rezervasyonlar ekranından yönetilir.";
    public const string ProductMissingMessage = "Talepteki ürünlerden biri artık menüde yok. Talebi reddedip müşteriye haber verin.";

    /// <summary>
    /// Masanın ödenmemiş son siparişini bulur; yoksa açar (rezerve masa → dolu, boş masa → dolu). Hizmet dışı masada
    /// sipariş açılmaz.
    /// </summary>
    public static async Task<Result<TableOrderTarget>> OpenOrFindAsync(IAppDbContext db, Guid tableId, CancellationToken cancellationToken)
    {
        Table table = await db.Tables
            .Include(t => t.Region)
            .FirstAsync(t => t.Id == tableId, cancellationToken);

        Order? order = await db.Orders
            .Include(o => o.OrderItems)
            .Where(o => o.TableId == table.Id && o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (order is not null)
            return Result<TableOrderTarget>.Success(new TableOrderTarget(table, order, TableOpened: false));

        if (table.Status == TableStatus.OutOfService)
            return Result<TableOrderTarget>.Failure("Masa hizmet dışı; sipariş açılamaz.");

        // Rezerve masaya müşteri oturmuş demektir; boş masa normal yoldan açılır.
        if (table.Status == TableStatus.Reserved)
            table.SetStatus(TableStatus.Occupied);
        else if (table.Status == TableStatus.Available)
            table.Occupy();

        order = Order.Create(table.Id, table.Region.BranchId);
        db.Orders.Add(order);
        return Result<TableOrderTarget>.Success(new TableOrderTarget(table, order, TableOpened: true));
    }

    /// <summary>
    /// Talebin kalemlerini masanın siparişine ekler ve talebi onaylar. Kalemde fiyat anlık görüntüsü (ön sipariş) varsa o
    /// fiyatla, yoksa (eski QR talepleri) ürünün güncel fiyatıyla yazılır. Talep notu siparişin notuna eklenir;
    /// <paramref name="noteLabel"/> verilirse ("Ön sipariş · Rezervasyon …") notun başına konur.
    /// </summary>
    public static async Task<Result<TableOrderTarget>> ApplyAsync(
        IAppDbContext db, OrderRequest orderRequest, string? noteLabel, CancellationToken cancellationToken)
    {
        Result<TableOrderTarget> target = await OpenOrFindAsync(db, orderRequest.TableId, cancellationToken);
        if (target.IsFailure)
            return target;

        Order order = target.Value!.Order;

        List<Guid> productIds = orderRequest.Items.Where(i => i.ProductId is not null).Select(i => i.ProductId!.Value).Distinct().ToList();
        List<Product> products = productIds.Count == 0 ? [] : await db.Products
            .Include(p => p.Category).ThenInclude(c => c.Branch)
            .Where(p => productIds.Contains(p.Id))
            .ToListAsync(cancellationToken);

        // Menü kalemleri garsonun menü eklemesiyle (AddSetMenuToOrder) aynı: menünün güncel fiyatı + seçim farkları,
        // menünün kategorisinin KDV'si (yoksa şubenin), her seçim mutfağa giden ayrı bir bileşen kalemi.
        List<Guid> setMenuIds = orderRequest.Items.Where(i => i.SetMenuId is not null).Select(i => i.SetMenuId!.Value).Distinct().ToList();
        List<SetMenu> setMenus = setMenuIds.Count == 0 ? [] : await db.SetMenus
            .Include(s => s.Branch)
            .Include(s => s.Category)
            .Include(s => s.Slots).ThenInclude(slot => slot.Options).ThenInclude(o => o.Product)
            .Where(s => setMenuIds.Contains(s.Id))
            .ToListAsync(cancellationToken);

        try
        {
            foreach (OrderRequestItem item in orderRequest.Items)
            {
                if (item.IsSetMenu)
                {
                    SetMenu? setMenu = setMenus.FirstOrDefault(s => s.Id == item.SetMenuId);
                    if (setMenu is null || setMenu.IsDeleted || setMenu.BranchId != target.Value.BranchId)
                        return Result<TableOrderTarget>.Failure(ProductMissingMessage);

                    decimal taxRate = setMenu.Category?.TaxRate ?? setMenu.Branch.TaxRate;
                    Dictionary<Guid, Guid> selections = DeliveryScope.ParseSelections(item.SelectionsJson);
                    if (item.UnitPrice is decimal menuPrice)
                        order.AddSetMenuAtPrice(setMenu, selections, menuPrice, item.Quantity, taxRate, item.Note);
                    else
                        order.AddSetMenu(setMenu, selections, item.Quantity, taxRate, item.Note);
                    continue;
                }

                Product? product = products.FirstOrDefault(p => p.Id == item.ProductId);
                if (product is null)
                    return Result<TableOrderTarget>.Failure(ProductMissingMessage);

                if (item.UnitPrice is decimal unitPrice)
                    order.AddItemAtPrice(product, unitPrice, item.Quantity, product.GetEffectiveTaxRate(), item.Note);
                else
                    order.AddItem(product, item.Quantity, product.GetEffectiveTaxRate(), item.Note);
            }
        }
        catch (DomainException ex)
        {
            // Menü onaya kadar satıştan kalktıysa ya da seçilen ürün pasifleştiyse; sipariş kaydedilmez (çağıran SaveChanges yapmaz).
            return Result<TableOrderTarget>.Failure(ex.Message);
        }

        string requestNote = string.IsNullOrWhiteSpace(noteLabel)
            ? orderRequest.Note
            : string.IsNullOrWhiteSpace(orderRequest.Note) ? noteLabel : $"{noteLabel}: {orderRequest.Note}";
        if (!string.IsNullOrWhiteSpace(requestNote))
            order.UpdateNote(string.IsNullOrWhiteSpace(order.Note) ? requestNote : $"{order.Note} / {requestNote}");

        // Garsonun onayladığı QR talebinin telefonu hesaba bağlanır (QrTableLock): artık o telefon masanın hesabını görür.
        // Hesap zaten başka bir telefona bağlıysa (kilit açılmadan önce gelmiş eski talep) bağ değişmez.
        if (orderRequest.Kind == OrderRequestKind.TableQr && orderRequest.DeviceTokenHash is { } deviceHash && order.QrOwnerTokenHash is null)
            order.SetQrOwner(deviceHash);

        orderRequest.Approve();
        return target;
    }
}
