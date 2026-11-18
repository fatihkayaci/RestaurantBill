using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Delivery.Staff;

internal static class DeliveryStaff
{
    // Paket siparişleri kasiyer ve yöneticiler yönetir; garson (kapsamı ne olursa olsun) erişemez.
    public static async Task<string?> CheckAccessAsync(IAppDbContext db, ICurrentUserService currentUser, CancellationToken cancellationToken)
    {
        StaffAccess access = await db.GetStaffAccessAsync(currentUser, cancellationToken);
        return access.IsWaiter ? DeliveryScope.WaiterDeniedMessage : null;
    }

    /// <summary>
    /// Ekranların şubesi: istekte şube verildiyse (erişilebilir olmalı) o, yoksa kullanıcının çalışma kapsamında tek
    /// şube varsa o. Owner "Tümü" modunda şube seçmeden şubeye ait işlem yapamaz.
    /// </summary>
    public static async Task<(Guid BranchId, string? Error)> ResolveSingleBranchAsync(
        IAppDbContext db, ICurrentUserService currentUser, Guid? branchId, CancellationToken cancellationToken)
    {
        if (branchId is Guid requested && requested != Guid.Empty)
        {
            List<Guid> accessible = await db.GetAccessibleBranchIdsAsync(currentUser, cancellationToken);
            return accessible.Contains(requested) ? (requested, null) : (Guid.Empty, "Şube bulunamadı.");
        }

        List<Guid> working = await db.GetWorkingBranchIdsAsync(currentUser, cancellationToken);
        return working.Count == 1 ? (working[0], null) : (Guid.Empty, "Önce bir şube seçin.");
    }

    public static async Task<List<DeliveryOrderDto>> ToDtosAsync(IAppDbContext db, IReadOnlyList<DeliveryOrder> orders, CancellationToken cancellationToken)
    {
        if (orders.Count == 0)
            return [];

        List<Guid> branchIds = orders.Select(o => o.BranchId).Distinct().ToList();
        Dictionary<Guid, OnlineOrderSettings> settings = (await db.Branches.AsNoTracking()
                .Where(b => branchIds.Contains(b.Id))
                .ToListAsync(cancellationToken))
            .ToDictionary(b => b.Id, b => b.GetOnlineOrderSettings());

        List<Guid> zoneIds = orders.Where(o => o.DeliveryZoneId is not null).Select(o => o.DeliveryZoneId!.Value).Distinct().ToList();
        Dictionary<Guid, int> zoneEta = await db.DeliveryZones.AsNoTracking()
            .Where(z => zoneIds.Contains(z.Id))
            .ToDictionaryAsync(z => z.Id, z => z.EstimatedMinutes, cancellationToken);

        List<Guid> courierIds = orders.Where(o => o.CourierUserId is not null).Select(o => o.CourierUserId!.Value).Distinct().ToList();
        Dictionary<Guid, string> courierNames = await db.Users.AsNoTracking()
            .Where(u => courierIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);

        List<string> phones = orders.Select(o => o.CustomerPhone).Distinct().ToList();
        HashSet<(Guid, string)> blocked = (await db.BlockedPhones.AsNoTracking()
                .Where(b => branchIds.Contains(b.BranchId) && phones.Contains(b.Phone) && !b.IsDeleted)
                .Select(b => new { b.BranchId, b.Phone })
                .ToListAsync(cancellationToken))
            .Select(b => (b.BranchId, b.Phone))
            .ToHashSet();

        Dictionary<Guid, string> productNames = await db.LoadSelectionNamesAsync(orders, cancellationToken);

        return orders.Select(o => DeliveryScope.ToStaffDto(
                o,
                settings.TryGetValue(o.BranchId, out OnlineOrderSettings? s) ? s : OnlineOrderSettings.Default(null, null),
                o.DeliveryZoneId is Guid zoneId && zoneEta.TryGetValue(zoneId, out int eta) ? eta : null,
                productNames,
                o.CourierUserId is Guid courierId ? courierNames.GetValueOrDefault(courierId) : null,
                blocked.Contains((o.BranchId, o.CustomerPhone))))
            .ToList();
    }
}

// ── Liste: active (açık siparişler) | today (bugünün iş günü) | history (kapanmış) ────────────────
public class GetDeliveryOrdersQuery : IRequest<Result<List<DeliveryOrderDto>>>
{
    public const string ActiveScope = "active";
    public const string TodayScope = "today";
    public const string HistoryScope = "history";
    public const int HistoryPageSize = 50;

    public string Scope { get; set; } = ActiveScope;
    /// <summary>Yalnızca history: 1'den başlar.</summary>
    public int Page { get; set; } = 1;
}

public class GetDeliveryOrdersQueryHandler(IAppDbContext db, ICurrentUserService currentUser, IBusinessDayResolver businessDay, TimeProvider clock)
    : IRequestHandler<GetDeliveryOrdersQuery, Result<List<DeliveryOrderDto>>>
{
    public async Task<Result<List<DeliveryOrderDto>>> Handle(GetDeliveryOrdersQuery request, CancellationToken cancellationToken)
    {
        if (await DeliveryStaff.CheckAccessAsync(db, currentUser, cancellationToken) is { } denied)
            return Result<List<DeliveryOrderDto>>.Failure(denied);

        List<Guid> branchIds = await db.GetWorkingBranchIdsAsync(currentUser, cancellationToken);
        IQueryable<DeliveryOrder> query = db.DeliveryOrders.AsNoTracking()
            .Include(d => d.Lines)
            .Where(d => branchIds.Contains(d.BranchId) && !d.IsDeleted);

        List<DeliveryOrder> orders;
        switch ((request.Scope ?? GetDeliveryOrdersQuery.ActiveScope).Trim().ToLowerInvariant())
        {
            case GetDeliveryOrdersQuery.ActiveScope:
                orders = await query
                    .Where(d => DeliveryScope.OpenStatuses.Contains(d.Status))
                    .OrderBy(d => d.CreatedAt)
                    .ToListAsync(cancellationToken);
                break;

            case GetDeliveryOrdersQuery.TodayScope:
            {
                // Şubenin iş günü (gün sonu saatine göre): gece yarısından sonraki siparişler önceki güne sayılabilir.
                DateTime now = clock.GetUtcNow().UtcDateTime;
                List<Branch> branches = await db.Branches.AsNoTracking().Where(b => branchIds.Contains(b.Id)).ToListAsync(cancellationToken);
                Dictionary<Guid, DateTime> dayStart = branches.ToDictionary(
                    b => b.Id,
                    b => businessDay.ToUtcRange(b, businessDay.ResolveBusinessDay(b, now), businessDay.ResolveBusinessDay(b, now)).FromUtc);
                if (dayStart.Count == 0)
                    return Result<List<DeliveryOrderDto>>.Success([]);

                DateTime earliest = dayStart.Values.Min();
                orders = (await query.Where(d => d.CreatedAt >= earliest).OrderByDescending(d => d.CreatedAt).ToListAsync(cancellationToken))
                    .Where(d => dayStart.TryGetValue(d.BranchId, out DateTime start) && d.CreatedAt >= start)
                    .ToList();
                break;
            }

            case GetDeliveryOrdersQuery.HistoryScope:
                int page = Math.Max(1, request.Page);
                orders = await query
                    .Where(d => !DeliveryScope.OpenStatuses.Contains(d.Status))
                    .OrderByDescending(d => d.CreatedAt)
                    .Skip((page - 1) * GetDeliveryOrdersQuery.HistoryPageSize)
                    .Take(GetDeliveryOrdersQuery.HistoryPageSize)
                    .ToListAsync(cancellationToken);
                break;

            default:
                return Result<List<DeliveryOrderDto>>.Failure("Geçersiz liste: active, today ya da history olmalı.");
        }

        return Result<List<DeliveryOrderDto>>.Success(await DeliveryStaff.ToDtosAsync(db, orders, cancellationToken));
    }
}

public class GetDeliveryOrderQuery : IRequest<Result<DeliveryOrderDto>>
{
    public Guid Id { get; set; }
}

public class GetDeliveryOrderQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<GetDeliveryOrderQuery, Result<DeliveryOrderDto>>
{
    public async Task<Result<DeliveryOrderDto>> Handle(GetDeliveryOrderQuery request, CancellationToken cancellationToken)
    {
        if (await DeliveryStaff.CheckAccessAsync(db, currentUser, cancellationToken) is { } denied)
            return Result<DeliveryOrderDto>.Failure(denied);

        List<Guid> branchIds = await db.GetAccessibleBranchIdsAsync(currentUser, cancellationToken);
        DeliveryOrder? order = await db.DeliveryOrders.AsNoTracking()
            .Include(d => d.Lines)
            .FirstOrDefaultAsync(d => d.Id == request.Id && branchIds.Contains(d.BranchId) && !d.IsDeleted, cancellationToken);
        if (order is null)
            return Result<DeliveryOrderDto>.Failure(DeliveryScope.NotFoundMessage);

        return Result<DeliveryOrderDto>.Success((await DeliveryStaff.ToDtosAsync(db, [order], cancellationToken))[0]);
    }
}

// ── Kuryeler: şubenin aktif kuryeleri, üzerlerindeki siparişler ve kasaya teslim edilmemiş tahsilat ──
public class GetCouriersQuery : IRequest<Result<List<CourierSummaryDto>>>
{
    public Guid? BranchId { get; set; }
}

public class GetCouriersQueryHandler(IAppDbContext db, ICurrentUserService currentUser, IBusinessDayResolver businessDay, TimeProvider clock)
    : IRequestHandler<GetCouriersQuery, Result<List<CourierSummaryDto>>>
{
    public async Task<Result<List<CourierSummaryDto>>> Handle(GetCouriersQuery request, CancellationToken cancellationToken)
    {
        if (await DeliveryStaff.CheckAccessAsync(db, currentUser, cancellationToken) is { } denied)
            return Result<List<CourierSummaryDto>>.Failure(denied);

        var (branchId, error) = await DeliveryStaff.ResolveSingleBranchAsync(db, currentUser, request.BranchId, cancellationToken);
        if (error is not null)
            return Result<List<CourierSummaryDto>>.Failure(error);

        var couriers = await db.UserBranches.AsNoTracking()
            .Where(ub => ub.BranchId == branchId && ub.Role == UserRole.Courier && ub.IsActive && !ub.IsDeleted && ub.User.IsActive && !ub.User.IsDeleted)
            .OrderBy(ub => ub.User.FullName)
            .Select(ub => new { ub.UserId, ub.User.FullName, ub.User.PhoneNumber })
            .ToListAsync(cancellationToken);

        List<Guid> courierIds = couriers.Select(c => c.UserId).ToList();
        var orders = await db.DeliveryOrders.AsNoTracking()
            .Where(d => d.BranchId == branchId && d.CourierUserId != null && courierIds.Contains(d.CourierUserId.Value) && !d.IsDeleted
                && (DeliveryScope.CourierActiveStatuses.Contains(d.Status)
                    || (d.Status == DeliveryOrderStatus.Delivered && d.SettledAt == null)))
            .Select(d => new
            {
                CourierId = d.CourierUserId!.Value, d.Id, d.Number, d.ZoneName, d.CustomerName, d.Status, d.CollectedMethod, d.CollectedAmount,
                d.DeliveredAt, d.CollectedAt
            })
            .ToListAsync(cancellationToken);

        // Önceki iş gününden kalan tahsilat: kurye parayı gün kapanmadan teslim etmemiş.
        Branch? branch = await db.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == branchId, cancellationToken);
        DateTime? todayStart = null;
        if (branch is not null)
        {
            DateOnly today = businessDay.ResolveBusinessDay(branch, clock.GetUtcNow().UtcDateTime);
            todayStart = businessDay.ToUtcRange(branch, today, today).FromUtc;
        }
        bool IsOld(DateTime? collectedAt) => todayStart is DateTime start && collectedAt is DateTime at && at < start;

        return Result<List<CourierSummaryDto>>.Success(couriers.Select(c =>
        {
            var mine = orders.Where(o => o.CourierId == c.UserId).ToList();
            var cash = mine.Where(o => o.Status == DeliveryOrderStatus.Delivered && o.CollectedMethod == PaymentMethod.Nakit).ToList();
            // Kart ve IBAN birlikte: nakitsiz tahsilat (kuryede para yok).
            var card = mine.Where(o => o.Status == DeliveryOrderStatus.Delivered && o.CollectedMethod is PaymentMethod.Kart or PaymentMethod.Iban).ToList();
            return new CourierSummaryDto
            {
                UserId = c.UserId,
                FullName = c.FullName,
                PhoneNumber = c.PhoneNumber ?? string.Empty,
                OpenOrderCount = mine.Count(o => DeliveryScope.CourierActiveStatuses.Contains(o.Status)),
                OnTheWayCount = mine.Count(o => o.Status == DeliveryOrderStatus.OnTheWay),
                OutstandingCash = cash.Sum(o => o.CollectedAmount ?? 0m),
                OutstandingCashOrderCount = cash.Count,
                OutstandingCard = card.Sum(o => o.CollectedAmount ?? 0m),
                OutstandingCardOrderCount = card.Count,
                PreviousDayCash = cash.Where(o => IsOld(o.CollectedAt)).Sum(o => o.CollectedAmount ?? 0m),
                PreviousDayOrderCount = cash.Concat(card).Count(o => IsOld(o.CollectedAt)),
                OldestCollectedAt = cash.Concat(card).Min(o => o.CollectedAt),
                OutstandingOrders = cash.Concat(card)
                    .OrderBy(o => o.DeliveredAt)
                    .Select(o => new CourierOutstandingOrderDto
                    {
                        DeliveryOrderId = o.Id,
                        Number = o.Number,
                        ZoneName = o.ZoneName,
                        CustomerName = DeliveryScope.MaskName(o.CustomerName),
                        CollectedMethod = o.CollectedMethod!.Value,
                        CollectedAmount = o.CollectedAmount ?? 0m,
                        DeliveredAt = o.DeliveredAt,
                        CollectedAt = o.CollectedAt,
                        IsFromPreviousDay = IsOld(o.CollectedAt)
                    })
                    .ToList()
            };
        }).ToList());
    }
}

// ── Kasanın "Online siparişe kapalı" anahtarının durumu ─────────────────────────────────────────
// Kasiyer ayarları okuyamaz (Owner/Admin); pano anahtarı bu uçtan okur. Durdurma olay göndermez, ekran yazdıktan sonra
// yeniden okur.
public class GetOnlineOrderingStatusQuery : IRequest<Result<OnlineOrderingPauseDto>>
{
    public Guid? BranchId { get; set; }
}

public class GetOnlineOrderingStatusQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<GetOnlineOrderingStatusQuery, Result<OnlineOrderingPauseDto>>
{
    public async Task<Result<OnlineOrderingPauseDto>> Handle(GetOnlineOrderingStatusQuery request, CancellationToken cancellationToken)
    {
        if (await DeliveryStaff.CheckAccessAsync(db, currentUser, cancellationToken) is { } denied)
            return Result<OnlineOrderingPauseDto>.Failure(denied);

        var (branchId, error) = await DeliveryStaff.ResolveSingleBranchAsync(db, currentUser, request.BranchId, cancellationToken);
        if (error is not null)
            return Result<OnlineOrderingPauseDto>.Failure(error);

        Branch branch = await db.Branches.AsNoTracking().FirstAsync(b => b.Id == branchId, cancellationToken);
        return Result<OnlineOrderingPauseDto>.Success(new OnlineOrderingPauseDto
        {
            BranchId = branch.Id,
            Paused = branch.OnlineOrdersPaused,
            Enabled = branch.GetOnlineOrderSettings().Enabled
        });
    }
}
