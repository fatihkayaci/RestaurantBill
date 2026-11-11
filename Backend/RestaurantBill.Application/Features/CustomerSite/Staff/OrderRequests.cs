using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CustomerSite.Staff;

// ── Onay bekleyen müşteri siparişleri ───────────────────────────────────────────────────────────
public class GetPendingOrderRequestsQuery : IRequest<Result<List<OrderRequestDto>>>
{
}

public class GetPendingOrderRequestsQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<GetPendingOrderRequestsQuery, Result<List<OrderRequestDto>>>
{
    public async Task<Result<List<OrderRequestDto>>> Handle(GetPendingOrderRequestsQuery request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await db.GetWorkingBranchIdsAsync(currentUser, cancellationToken);

        List<OrderRequest> requests = await db.OrderRequests.AsNoTracking()
            .Include(r => r.Items).ThenInclude(i => i.Product)
            .Include(r => r.Table).ThenInclude(t => t.Region)
            .Where(r => r.Status == OrderRequestStatus.Pending && branchIds.Contains(r.Table.Region.BranchId))
            .OrderBy(r => r.CreatedAt)
            .ToListAsync(cancellationToken);

        List<OrderRequestDto> result = requests.Select(r => new OrderRequestDto
        {
            Id = r.Id,
            TableId = r.TableId,
            TableName = r.Table.Name,
            RegionName = r.Table.Region.Name,
            Note = r.Note,
            CreatedAt = r.CreatedAt,
            Total = r.Items.Sum(i => i.Product.Price * i.Quantity),
            Items = r.Items.Select(i => new OrderRequestItemDto
            {
                ProductId = i.ProductId,
                ProductName = i.Product.Name,
                Quantity = i.Quantity,
                UnitPrice = i.Product.Price,
                Note = i.Note
            }).ToList()
        }).ToList();

        return Result<List<OrderRequestDto>>.Success(result);
    }
}

// ── Onay: talep masanın siparişine eklenir (masa boşsa sipariş açılır) ──────────────────────────
public class ApproveOrderRequestCommand : IRequest<Result>
{
    public Guid Id { get; set; }
}

public class ApproveOrderRequestCommandHandler(
    IAppDbContext db,
    ICurrentUserService currentUser,
    ITableNotificationService tableNotifications,
    ICashierNotificationService cashierNotifications)
    : IRequestHandler<ApproveOrderRequestCommand, Result>
{
    public async Task<Result> Handle(ApproveOrderRequestCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await db.GetAccessibleBranchIdsAsync(currentUser, cancellationToken);

        OrderRequest? orderRequest = await db.OrderRequests
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == request.Id && branchIds.Contains(r.Table.Region.BranchId), cancellationToken);

        if (orderRequest is null)
            return Result.Failure("Böyle bir sipariş talebi bulunamadı.");
        if (orderRequest.Status != OrderRequestStatus.Pending)
            return Result.Failure("Bu talep zaten işlendi.");

        Table table = await db.Tables
            .Include(t => t.Region)
            .FirstAsync(t => t.Id == orderRequest.TableId, cancellationToken);
        Guid branchId = table.Region.BranchId;

        Order? order = await db.Orders
            .Include(o => o.OrderItems)
            .Where(o => o.TableId == table.Id && o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        bool tableOpened = false;
        if (order is null)
        {
            if (table.Status == TableStatus.OutOfService)
                return Result.Failure("Masa hizmet dışı; sipariş açılamaz.");

            // Rezerve masaya müşteri oturmuş demektir; boş masa normal yoldan açılır.
            if (table.Status == TableStatus.Reserved)
                table.SetStatus(TableStatus.Occupied);
            else if (table.Status == TableStatus.Available)
                table.Occupy();

            order = Order.Create(table.Id);
            db.Orders.Add(order);
            tableOpened = true;
        }

        List<Guid> productIds = orderRequest.Items.Select(i => i.ProductId).Distinct().ToList();
        List<Product> products = await db.Products
            .Include(p => p.Category).ThenInclude(c => c.Branch)
            .Where(p => productIds.Contains(p.Id))
            .ToListAsync(cancellationToken);

        foreach (OrderRequestItem item in orderRequest.Items)
        {
            Product? product = products.FirstOrDefault(p => p.Id == item.ProductId);
            if (product is null)
                return Result.Failure("Talepteki ürünlerden biri artık menüde yok. Talebi reddedip müşteriye haber verin.");

            order.AddItem(product, item.Quantity, product.Category.GetEffectiveTaxRate(), item.Note);
        }

        if (!string.IsNullOrWhiteSpace(orderRequest.Note))
            order.UpdateNote(string.IsNullOrWhiteSpace(order.Note) ? orderRequest.Note : $"{order.Note} / {orderRequest.Note}");

        orderRequest.Approve();

        User? actor = await db.Users.FirstOrDefaultAsync(u => u.Id == currentUser.UserId, cancellationToken);
        string actorName = actor?.FullName ?? string.Empty;

        db.AuditLogs.Add(AuditLog.Create(
            branchId,
            actorName,
            AuditLogCategory.Order,
            AuditLogSeverity.Info,
            "OrderRequestApproved",
            $"{actorName} {table.Name} masasından gelen müşteri siparişini onayladı.",
            nameof(Order),
            order.Id));

        await db.SaveChangesAsync(cancellationToken);

        if (tableOpened)
            await tableNotifications.SendTableStatusChangedAsync(branchId, table.Id, (int)table.Status);
        await tableNotifications.SendOrderUpdatedAsync(branchId, table.Id, order.TotalPrice, actorName);
        await tableNotifications.SendCustomerRequestsChangedAsync(branchId);
        await cashierNotifications.SendOrdersChangedAsync(branchId);

        return Result.Success();
    }
}

// ── Red ─────────────────────────────────────────────────────────────────────────────────────────
public class RejectOrderRequestCommand : IRequest<Result>
{
    public Guid Id { get; set; }
}

public class RejectOrderRequestCommandHandler(IAppDbContext db, ICurrentUserService currentUser, ITableNotificationService tableNotifications)
    : IRequestHandler<RejectOrderRequestCommand, Result>
{
    public async Task<Result> Handle(RejectOrderRequestCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await db.GetAccessibleBranchIdsAsync(currentUser, cancellationToken);

        OrderRequest? orderRequest = await db.OrderRequests
            .Include(r => r.Table).ThenInclude(t => t.Region)
            .FirstOrDefaultAsync(r => r.Id == request.Id && branchIds.Contains(r.Table.Region.BranchId), cancellationToken);

        if (orderRequest is null)
            return Result.Failure("Böyle bir sipariş talebi bulunamadı.");
        if (orderRequest.Status != OrderRequestStatus.Pending)
            return Result.Failure("Bu talep zaten işlendi.");

        orderRequest.Reject();
        await db.SaveChangesAsync(cancellationToken);

        await tableNotifications.SendCustomerRequestsChangedAsync(orderRequest.Table.Region.BranchId);
        return Result.Success();
    }
}
