using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CustomerSite.Staff;

// ── "QR kilidini aç" ────────────────────────────────────────────────────────────────────────────
// Masa QR'da bir telefona bağlıyken (QrTableLock) garson ya da yönetici bağı kaldırır: masadan sonraki ilk talebi
// gönderen telefon yeni sahip olur. Örnek: müşteri telefonunu değiştirdi, ya da masa dışından biri masayı tuttu.
// Bekleyen talepler silinmez, yalnızca masayı artık o telefona bağlamaz. Garson masanın kapsamında olmalıdır.
public class UnlockQrTableCommand : IRequest<Result>
{
    public Guid TableId { get; set; }
}

public class UnlockQrTableCommandHandler(IAppDbContext db, ICurrentUserService currentUser, ITableNotificationService tableNotifications)
    : IRequestHandler<UnlockQrTableCommand, Result>
{
    public const string TableNotFoundMessage = "Masa bulunamadı.";

    public async Task<Result> Handle(UnlockQrTableCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await db.GetAccessibleBranchIdsAsync(currentUser, cancellationToken);

        Table? table = await db.Tables
            .Include(t => t.Region)
            .FirstOrDefaultAsync(t => t.Id == request.TableId && branchIds.Contains(t.Region.BranchId), cancellationToken);
        if (table is null)
            return Result.Failure(TableNotFoundMessage);

        string? accessError = await db.CheckTableAccessAsync(currentUser, table.Id, permission: null, cancellationToken);
        if (accessError is not null)
            return Result.Failure(accessError);

        Order? order = await QrTableLock.FindOpenOrderAsync(db, table.Id, track: true, cancellationToken);
        order?.ClearQrOwner();

        List<OrderRequest> pending = await db.OrderRequests
            .Where(r => r.TableId == table.Id && r.Kind == OrderRequestKind.TableQr && r.Status == OrderRequestStatus.Pending && r.DeviceTokenHash != null)
            .ToListAsync(cancellationToken);
        foreach (OrderRequest orderRequest in pending)
            orderRequest.ClearDeviceToken();

        string actorName = await db.ActorNameAsync(currentUser, cancellationToken);
        db.AuditLogs.Add(AuditLog.Create(
            table.Region.BranchId,
            actorName,
            AuditLogCategory.Order,
            AuditLogSeverity.Info,
            "QrTableUnlocked",
            $"{actorName} {table.Name} masasının QR kilidini açtı.",
            nameof(Table),
            table.Id));

        await db.SaveChangesAsync(cancellationToken);

        // Masa ekranları siparişi yeniden çeker; "QR: telefona bağlı" işareti kalkar.
        if (order is not null)
            await tableNotifications.SendOrderUpdatedAsync(table.Region.BranchId, order, actorName);

        return Result.Success();
    }
}
