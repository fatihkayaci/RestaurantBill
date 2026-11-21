using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.SetTableQrLock;

// ── "QR siparişi: Açık / Kilitli" ───────────────────────────────────────────────────────────────
// Personel bir masada QR'dan siparişi kapatır ya da yeniden açar. Kilitliyken müşteri menüye bakar, garson çağırır,
// hesap ister ve hesabı görür; sipariş talebi gönderemez (CreateOrderRequest reddeder). Bekleyen talepler olduğu gibi
// garsonda kalır. Owner/Admin her zaman; garson yalnız "QR siparişini kilitleme" yetkisiyle ve kapsamındaki masada;
// kasiyer, mutfak ve kurye hiç.
public class SetTableQrLockCommand : IRequest<Result>
{
    public Guid TableId { get; set; }
    public bool Locked { get; set; }
}

public class SetTableQrLockCommandValidator : AbstractValidator<SetTableQrLockCommand>
{
    public SetTableQrLockCommandValidator()
    {
        RuleFor(x => x.TableId).NotEqual(Guid.Empty).WithMessage("Geçerli bir masa seçilmelidir.");
    }
}

public class SetTableQrLockCommandHandler(IAppDbContext db, ICurrentUserService currentUser, ITableNotificationService tableNotifications)
    : IRequestHandler<SetTableQrLockCommand, Result>
{
    public const string TableNotFoundMessage = "Masa bulunamadı.";

    /// <summary>Yetkili roller: yöneticiler ve (yetkisi varsa) garson.</summary>
    public static bool RoleMayLock(string role) => role is "Owner" or "Admin" or "Waiter";

    public async Task<Result> Handle(SetTableQrLockCommand request, CancellationToken cancellationToken)
    {
        if (!RoleMayLock(currentUser.Role))
            return Result.Failure(StaffAccess.QrLockDeniedMessage);

        List<Guid> branchIds = await db.GetAccessibleBranchIdsAsync(currentUser, cancellationToken);
        Table? table = await db.Tables
            .Include(t => t.Region)
            .FirstOrDefaultAsync(t => t.Id == request.TableId && branchIds.Contains(t.Region.BranchId), cancellationToken);
        if (table is null)
            return Result.Failure(TableNotFoundMessage);

        // Garsonda önce yetki, sonra masanın kapsamında olması; yöneticilerde kısıt yok.
        string? accessError = await db.CheckTableAccessAsync(currentUser, table.Id, WaiterPermission.LockQr, cancellationToken);
        if (accessError is not null)
            return Result.Failure(accessError);

        if (table.QrOrderingLocked == request.Locked)
            return Result.Success();

        if (request.Locked)
            table.LockQrOrdering();
        else
            table.UnlockQrOrdering();

        string actorName = await db.ActorNameAsync(currentUser, cancellationToken);
        db.AuditLogs.Add(AuditLog.Create(
            table.Region.BranchId,
            actorName,
            AuditLogCategory.Order,
            AuditLogSeverity.Info,
            request.Locked ? "QrOrderingLocked" : "QrOrderingUnlocked",
            request.Locked
                ? $"{actorName} {table.Name} masasında QR siparişini kilitledi."
                : $"{actorName} {table.Name} masasında QR siparişini açtı.",
            nameof(Table),
            table.Id));

        await db.SaveChangesAsync(cancellationToken);

        // Açık personel ekranları masa kartındaki kilit işaretini günceller; müşteri sayfası bir sonraki yoklamada görür.
        await tableNotifications.SendTableQrLockChangedAsync(table.Region.BranchId, table.Id, table.QrOrderingLocked);

        return Result.Success();
    }
}
