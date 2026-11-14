using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CustomerSite.Staff;

// ── Müşteri rezervasyonları: bekleyen talepler + bitmemiş onaylılar ─────────────────────────────
public class GetCustomerReservationsQuery : IRequest<Result<List<StaffReservationDto>>>
{
}

public class GetCustomerReservationsQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<GetCustomerReservationsQuery, Result<List<StaffReservationDto>>>
{
    public async Task<Result<List<StaffReservationDto>>> Handle(GetCustomerReservationsQuery request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await db.GetWorkingBranchIdsAsync(currentUser, cancellationToken);
        DateTime nowUtc = DateTime.UtcNow;
        StaffAccess access = await db.GetStaffAccessAsync(currentUser, cancellationToken);

        var rows = await db.Reservations.AsNoTracking()
            .InStaffRegions(access)
            .Where(r => branchIds.Contains(r.Table.Region.BranchId)
                && (r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Confirmed)
                && r.EndTime != null && r.EndTime > nowUtc)
            .OrderBy(r => r.ReservationTime)
            .Select(r => new
            {
                r.Id, r.Code, r.AccessToken, r.Status, r.TableId, r.GuestName, r.Contact, r.Note, r.PartySize, r.ReservationTime, r.EndTime, r.CreatedAt,
                TableName = r.Table.Name,
                RegionName = r.Table.Region.Name,
                r.Table.Region.Branch.TimeZoneId,
                SiteSlug = r.Table.Region.Branch.Company.Slug
            })
            .ToListAsync(cancellationToken);

        List<Guid> reservationIds = rows.Select(r => r.Id).ToList();
        Dictionary<Guid, OrderRequest> preOrders = (await db.OrderRequests.AsNoTracking()
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Where(o => o.Kind == OrderRequestKind.PreOrder && o.ReservationId != null && reservationIds.Contains(o.ReservationId.Value))
                .ToListAsync(cancellationToken))
            .GroupBy(o => o.ReservationId!.Value)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(o => o.CreatedAt).First());

        List<Guid> tableIds = rows.Select(r => r.TableId).Distinct().ToList();
        HashSet<Guid> tablesWithOpenOrder = (await db.Orders.AsNoTracking()
                .Where(o => o.TableId != null && tableIds.Contains(o.TableId.Value)
                    && o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled)
                .Select(o => o.TableId!.Value)
                .ToListAsync(cancellationToken))
            .ToHashSet();

        List<StaffReservationDto> result = rows.Select(r =>
        {
            TimeZoneInfo zone = CustomerSiteScope.ZoneOf(r.TimeZoneId);
            return new StaffReservationDto
            {
                PreOrder = preOrders.TryGetValue(r.Id, out OrderRequest? preOrder) ? ToStaffPreOrder(preOrder) : null,
                TableHasOpenOrder = tablesWithOpenOrder.Contains(r.TableId),
                Id = r.Id,
                Code = ReservationCode.Format(r.Code),
                AccessToken = r.AccessToken,
                SiteSlug = r.SiteSlug,
                Status = (int)r.Status,
                TableId = r.TableId,
                TableName = r.TableName,
                RegionName = r.RegionName,
                GuestName = r.GuestName,
                Contact = r.Contact,
                Note = r.Note,
                PartySize = r.PartySize,
                Date = CustomerSiteScope.LocalDate(r.ReservationTime, zone),
                Time = CustomerSiteScope.LocalTime(r.ReservationTime, zone),
                EndTime = CustomerSiteScope.LocalTime(r.EndTime!.Value, zone),
                StartsAtUtc = r.ReservationTime,
                CreatedAt = r.CreatedAt
            };
        }).ToList();

        return Result<List<StaffReservationDto>>.Success(result);
    }

    private static StaffPreOrderDto ToStaffPreOrder(OrderRequest preOrder) => new()
    {
        Status = (int)preOrder.Status,
        Note = preOrder.Note,
        UpdatedAt = preOrder.UpdatedAt ?? preOrder.CreatedAt,
        Total = preOrder.Items.Sum(i => (i.UnitPrice ?? i.Product.Price) * i.Quantity),
        Items = preOrder.Items.Select(i => new OrderRequestItemDto
        {
            ProductId = i.ProductId,
            ProductName = i.Product.Name,
            Quantity = i.Quantity,
            UnitPrice = i.UnitPrice ?? i.Product.Price,
            Note = i.Note
        }).ToList()
    };
}

// ── Onayla / reddet / iptal et. Masanın anlık durumuna dokunulmaz. ──────────────────────────────
public enum ReservationDecision
{
    Confirm = 1,
    Reject = 2,
    Cancel = 3
}

public class DecideReservationCommand : IRequest<Result>
{
    public Guid Id { get; set; }
    public ReservationDecision Decision { get; set; }
}

public class DecideReservationCommandHandler(IAppDbContext db, ICurrentUserService currentUser, ITableNotificationService tableNotifications)
    : IRequestHandler<DecideReservationCommand, Result>
{
    public async Task<Result> Handle(DecideReservationCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await db.GetAccessibleBranchIdsAsync(currentUser, cancellationToken);

        Reservation? reservation = await db.Reservations
            .Include(r => r.Table).ThenInclude(t => t.Region)
            .FirstOrDefaultAsync(r => r.Id == request.Id && branchIds.Contains(r.Table.Region.BranchId), cancellationToken);

        // Personelin açtığı eski tip (Active) kayıtlar bu uçtan yönetilmez; onların kendi iptal akışı var.
        if (reservation is null || reservation.EndTime is null || reservation.Status == ReservationStatus.Active)
            return Result.Failure("Böyle bir rezervasyon bulunamadı.");

        string? accessError = await db.CheckTableAccessAsync(currentUser, reservation.TableId, WaiterPermission.TransferAndReserve, cancellationToken);
        if (accessError is not null)
            return Result.Failure(accessError);

        switch (request.Decision)
        {
            case ReservationDecision.Confirm:
                if (reservation.Status != ReservationStatus.Pending)
                    return Result.Failure("Bu talep zaten işlendi.");

                // Aynı aralığa iki bekleyen talep düşmüş olabilir; yalnızca biri onaylanabilir.
                List<Reservation> overlapping = await CustomerSiteScope.FindOverlappingAsync(
                    db, [reservation.TableId], reservation.ReservationTime, reservation.EndTime.Value,
                    [ReservationStatus.Confirmed, ReservationStatus.Active], cancellationToken);
                if (overlapping.Any(r => r.Id != reservation.Id))
                    return Result.Failure("Bu masada aynı saat aralığında onaylı başka bir rezervasyon var.");

                reservation.Confirm();
                break;

            case ReservationDecision.Reject:
                if (reservation.Status != ReservationStatus.Pending)
                    return Result.Failure("Bu talep zaten işlendi.");
                reservation.Reject();
                break;

            case ReservationDecision.Cancel:
                if (reservation.Status != ReservationStatus.Confirmed && reservation.Status != ReservationStatus.Pending)
                    return Result.Failure("Bu rezervasyon zaten kapatılmış.");
                reservation.Cancel();
                break;

            default:
                return Result.Failure("Geçersiz işlem.");
        }

        // İptal ya da retle bekleyen ön sipariş de düşer; mutfağa hiç gitmez.
        bool preOrderCancelled = request.Decision != ReservationDecision.Confirm
            && await PreOrderRules.CancelPendingAsync(db, reservation.Id, cancellationToken);

        string actorName = await db.ActorNameAsync(currentUser, cancellationToken);
        string verb = request.Decision switch
        {
            ReservationDecision.Confirm => "onayladı",
            ReservationDecision.Reject => "reddetti",
            _ => "iptal etti"
        };
        db.AuditLogs.Add(AuditLog.Create(reservation.Table.Region.BranchId, actorName, AuditLogCategory.Order, AuditLogSeverity.Info,
            $"Reservation{request.Decision}",
            $"{actorName} {reservation.GuestName} rezervasyonunu ({reservation.Table.Name}) {verb}.{(preOrderCancelled ? " Ön siparişi de iptal edildi." : string.Empty)}",
            nameof(Reservation), reservation.Id));

        await db.SaveChangesAsync(cancellationToken);
        await tableNotifications.SendCustomerRequestsChangedAsync(reservation.Table.Region.BranchId);
        return Result.Success();
    }
}

// ── "Geldi" / "Gelmedi" / "Mutfağa şimdi gönder" ──────────────────────────────────────────────────
public enum ReservationArrival
{
    /// <summary>Misafir geldi: masa dolu olur, bekleyen ön sipariş masanın siparişine yazılıp mutfağa gider.</summary>
    Seat = 1,
    /// <summary>Misafir gelmedi: bekleyen ön sipariş iptal edilir. Yalnızca personel işaretler, otomatik değildir.</summary>
    NoShow = 2,
    /// <summary>Ön siparişi misafir gelmeden mutfağa gönder; rezervasyon da "geldi" sayılır.</summary>
    FirePreOrder = 3
}

public class ReservationArrivalCommand : IRequest<Result>
{
    public Guid Id { get; set; }
    public ReservationArrival Action { get; set; }
}

public class ReservationArrivalCommandHandler(
    IAppDbContext db,
    ICurrentUserService currentUser,
    ITableNotificationService tableNotifications,
    ICashierNotificationService cashierNotifications,
    IKitchenNotificationService kitchenNotifications,
    TimeProvider clock)
    : IRequestHandler<ReservationArrivalCommand, Result>
{
    public async Task<Result> Handle(ReservationArrivalCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await db.GetAccessibleBranchIdsAsync(currentUser, cancellationToken);

        Reservation? reservation = await db.Reservations
            .Include(r => r.Table).ThenInclude(t => t.Region).ThenInclude(r => r.Branch)
            .FirstOrDefaultAsync(r => r.Id == request.Id && branchIds.Contains(r.Table.Region.BranchId), cancellationToken);

        // DecideReservation gibi: personelin açtığı eski tip (Active) kayıtlar bu uçtan yönetilmez.
        if (reservation is null || reservation.EndTime is null || reservation.Status == ReservationStatus.Active)
            return Result.Failure("Böyle bir rezervasyon bulunamadı.");

        string? accessError = await db.CheckTableAccessAsync(currentUser, reservation.TableId, WaiterPermission.TransferAndReserve, cancellationToken);
        if (accessError is not null)
            return Result.Failure(accessError);

        if (reservation.Status == ReservationStatus.Pending)
            return Result.Failure("Önce rezervasyonu onaylayın.");
        if (reservation.Status != ReservationStatus.Confirmed)
            return Result.Failure("Bu rezervasyon zaten kapatılmış.");

        DateTime now = clock.GetUtcNow().UtcDateTime;
        Guid branchId = reservation.Table.Region.BranchId;
        string actorName = await db.ActorNameAsync(currentUser, cancellationToken);

        if (request.Action == ReservationArrival.NoShow)
            return await MarkNoShowAsync(reservation, branchId, actorName, now, cancellationToken);
        if (request.Action is not (ReservationArrival.Seat or ReservationArrival.FirePreOrder))
            return Result.Failure("Geçersiz işlem.");

        OrderRequest? preOrder = await PreOrderRules.FindPendingAsync(db, reservation.Id, cancellationToken);
        if (request.Action == ReservationArrival.FirePreOrder && preOrder is null)
            return Result.Failure("Mutfağa gönderilecek bekleyen bir ön sipariş yok.");

        try
        {
            reservation.Seat(now);
        }
        catch (DomainException ex)
        {
            return Result.Failure(ex.Message);
        }

        TimeZoneInfo zone = CustomerSiteScope.ZoneOf(reservation.Table.Region.Branch.TimeZoneId);
        Result<TableOrderTarget> applied = preOrder is null
            ? await ApplyRequestToTableOrder.OpenOrFindAsync(db, reservation.TableId, cancellationToken)
            : await ApplyRequestToTableOrder.ApplyAsync(db, preOrder, PreOrderRules.StaffLabel(reservation, zone), cancellationToken);
        if (applied.IsFailure)
            return Result.Failure(applied.Error!);

        var (table, order, tableOpened) = applied.Value!;

        string message = request.Action == ReservationArrival.FirePreOrder
            ? $"{actorName} {reservation.GuestName} rezervasyonunun ön siparişini misafir gelmeden mutfağa gönderdi ({table.Name})."
            : preOrder is null
                ? $"{actorName} {reservation.GuestName} rezervasyonunu 'geldi' olarak işaretledi ({table.Name})."
                : $"{actorName} {reservation.GuestName} rezervasyonunu 'geldi' olarak işaretledi; ön sipariş mutfağa gönderildi ({table.Name}).";
        db.AuditLogs.Add(AuditLog.Create(branchId, actorName, AuditLogCategory.Order, AuditLogSeverity.Info,
            request.Action == ReservationArrival.FirePreOrder ? "ReservationPreOrderFired" : "ReservationSeated",
            message, nameof(Reservation), reservation.Id));

        await db.SaveChangesAsync(cancellationToken);

        if (tableOpened)
            await tableNotifications.SendTableStatusChangedAsync(branchId, table.Id, (int)table.Status);
        await tableNotifications.SendOrderUpdatedAsync(branchId, order, actorName);
        await tableNotifications.SendCustomerRequestsChangedAsync(branchId);
        await cashierNotifications.SendOrdersChangedAsync(branchId);
        if (preOrder is not null)
            await kitchenNotifications.SendOrdersChangedAsync(branchId);

        return Result.Success();
    }

    private async Task<Result> MarkNoShowAsync(Reservation reservation, Guid branchId, string actorName, DateTime now, CancellationToken cancellationToken)
    {
        try
        {
            reservation.MarkNoShow(now);
        }
        catch (DomainException ex)
        {
            return Result.Failure(ex.Message);
        }

        bool preOrderCancelled = await PreOrderRules.CancelPendingAsync(db, reservation.Id, cancellationToken);
        db.AuditLogs.Add(AuditLog.Create(branchId, actorName, AuditLogCategory.Order, AuditLogSeverity.Warning, "ReservationNoShow",
            $"{actorName} {reservation.GuestName} rezervasyonunu 'gelmedi' olarak işaretledi ({reservation.Table.Name}).{(preOrderCancelled ? " Ön siparişi iptal edildi." : string.Empty)}",
            nameof(Reservation), reservation.Id));

        await db.SaveChangesAsync(cancellationToken);
        await tableNotifications.SendCustomerRequestsChangedAsync(branchId);
        return Result.Success();
    }
}
