using System.Globalization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.DTOs.Stats;
using RestaurantBill.Application.Features.CustomerSite;
using RestaurantBill.Application.Features.Orders.Overdue;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Stats.Queries.GetDashboard;

public class GetDashboardQuery : IRequest<Result<DashboardDto>>
{
}

public class GetDashboardQueryHandler : IRequestHandler<GetDashboardQuery, Result<DashboardDto>>
{
    private static readonly CultureInfo Tr = CultureInfo.GetCultureInfo("tr-TR");

    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetDashboardQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<DashboardDto>> Handle(GetDashboardQuery request, CancellationToken cancellationToken)
    {
        Guid branchId = _currentUser.BranchId;
        if (branchId == Guid.Empty) return Result<DashboardDto>.Failure("Geçersiz şube bilgisi.");

        string? timeZoneId = await _db.Branches
            .AsNoTracking()
            .Where(b => b.Id == branchId)
            .Select(b => b.TimeZoneId)
            .FirstOrDefaultAsync(cancellationToken);
        if (timeZoneId is null) return Result<DashboardDto>.Failure("Şube bulunamadı.");

        // "Bugün" şubenin yerel gün başından itibarendir; UTC gün başı Türkiye'de 03:00'e denk gelirdi.
        TimeZoneInfo zone = CustomerSiteScope.ZoneOf(timeZoneId);
        DateTime nowUtc = DateTime.UtcNow;
        DateTime localToday = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, zone).Date;
        DateTime ToUtc(DateTime localMidnight) =>
            TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(localMidnight, DateTimeKind.Unspecified), zone);
        DateTime ToLocal(DateTime utc) =>
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), zone);

        DateTime todayStart = ToUtc(localToday);
        DateTime todayEnd = ToUtc(localToday.AddDays(1));
        DateTime yesterdayStart = ToUtc(localToday.AddDays(-1));
        DateTime lastWeekDayStart = ToUtc(localToday.AddDays(-7));
        DateTime lastWeekDayEnd = ToUtc(localToday.AddDays(-6));
        DateTime weekStart = ToUtc(localToday.AddDays(-6));

        var payments = await _db.Payments
            .AsNoTracking()
            .Where(p => p.CashRegister.BranchId == branchId && p.CreatedAt >= lastWeekDayStart && p.CreatedAt < todayEnd)
            .Select(p => new { p.CreatedAt, p.TotalAmount, p.PaymentMethod, p.OrderId })
            .ToListAsync(cancellationToken);

        var todayPayments = payments.Where(p => p.CreatedAt >= todayStart).ToList();
        decimal today = todayPayments.Sum(p => p.TotalAmount);
        decimal sameTimeYesterday = payments
            .Where(p => p.CreatedAt >= yesterdayStart && p.CreatedAt < nowUtc.AddDays(-1))
            .Sum(p => p.TotalAmount);
        int closedBills = todayPayments.Select(p => p.OrderId).Distinct().Count();

        var revenue = new DashboardRevenueDto
        {
            Today = today,
            Cash = todayPayments.Where(p => p.PaymentMethod == PaymentMethod.Nakit).Sum(p => p.TotalAmount),
            Card = todayPayments.Where(p => p.PaymentMethod == PaymentMethod.Kart).Sum(p => p.TotalAmount),
            Other = todayPayments.Where(p => p.PaymentMethod != PaymentMethod.Nakit && p.PaymentMethod != PaymentMethod.Kart).Sum(p => p.TotalAmount),
            SameTimeYesterday = sameTimeYesterday,
            ChangePercent = sameTimeYesterday == 0 ? null : Math.Round((today - sameTimeYesterday) / sameTimeYesterday * 100, 1),
            ClosedBills = closedBills,
            AvgBill = closedBills > 0 ? Math.Round(today / closedBills, 2) : 0,
        };

        List<DashboardHourDto> hourly = Enumerable.Range(0, 24)
            .Select(h => new DashboardHourDto { Hour = h })
            .ToList();
        foreach (var p in payments)
        {
            if (p.CreatedAt >= todayStart)
                hourly[ToLocal(p.CreatedAt).Hour].Today += p.TotalAmount;
            else if (p.CreatedAt >= lastWeekDayStart && p.CreatedAt < lastWeekDayEnd)
                hourly[ToLocal(p.CreatedAt).Hour].LastWeek += p.TotalAmount;
        }

        // Masalar ve açık siparişleri: masa haritası ve "Şu an" kartı aynı veriden beslenir.
        var tables = await _db.Tables
            .AsNoTracking()
            .Where(t => t.Region.BranchId == branchId && !t.IsDeleted && !t.Region.IsDeleted)
            .Select(t => new { t.Id, t.Name, t.Status, t.RegionId, RegionName = t.Region.Name, RegionCreatedAt = t.Region.CreatedAt })
            .ToListAsync(cancellationToken);
        List<Guid> tableIds = tables.Select(t => t.Id).ToList();

        var openOrders = await _db.Orders
            .AsNoTracking()
            .Where(o => tableIds.Contains(o.TableId) && o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled)
            .Select(o => new
            {
                o.TableId,
                o.TotalPrice,
                o.CreatedAt,
                InKitchen = o.OrderItems.Any(i => i.Status == OrderItemStatus.Pending || i.Status == OrderItemStatus.Preparing)
            })
            .ToListAsync(cancellationToken);
        var orderByTable = openOrders
            .GroupBy(o => o.TableId)
            .ToDictionary(g => g.Key, g => new { Since = g.Min(o => o.CreatedAt), Total = g.Sum(o => o.TotalPrice) });

        var reservations = await _db.Reservations
            .AsNoTracking()
            .Where(r => tableIds.Contains(r.TableId) && !r.IsDeleted
                && r.ReservationTime >= todayStart && r.ReservationTime < todayEnd
                && (r.Status == ReservationStatus.Active || r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Confirmed))
            .OrderBy(r => r.ReservationTime)
            .Select(r => new { r.Id, r.TableId, r.ReservationTime, r.GuestName, r.PartySize, r.Status })
            .ToListAsync(cancellationToken);
        Dictionary<Guid, string> tableNameById = tables.ToDictionary(t => t.Id, t => t.Name);

        // Masa kutusunda gösterilecek rezervasyon: bugünün henüz geçmemiş en yakını (iptal/ret hariç).
        var nextReservationByTable = reservations
            .Where(r => r.ReservationTime >= nowUtc.AddMinutes(-30) && r.Status != ReservationStatus.Pending)
            .GroupBy(r => r.TableId)
            .ToDictionary(g => g.Key, g => g.First());

        List<DashboardRegionDto> regions = tables
            .GroupBy(t => new { t.RegionId, t.RegionName, t.RegionCreatedAt })
            .OrderBy(g => g.Key.RegionCreatedAt)
            .Select(g => new DashboardRegionDto
            {
                Id = g.Key.RegionId,
                Name = g.Key.RegionName,
                Tables = g
                    .OrderBy(t => t.Name.Length).ThenBy(t => t.Name, StringComparer.Create(Tr, true))
                    .Select(t =>
                    {
                        var order = orderByTable.GetValueOrDefault(t.Id);
                        var next = nextReservationByTable.GetValueOrDefault(t.Id);
                        return new DashboardTableDto
                        {
                            Id = t.Id,
                            Name = t.Name,
                            Status = t.Status,
                            OccupiedSince = order?.Since,
                            ActiveOrderTotal = order?.Total ?? 0,
                            NextReservationTime = next is null ? null : ToLocal(next.ReservationTime).ToString("HH:mm", CultureInfo.InvariantCulture),
                            NextReservationGuest = next?.GuestName,
                        };
                    })
                    .ToList()
            })
            .ToList();

        var longestOpen = orderByTable.OrderBy(kv => kv.Value.Since).FirstOrDefault();
        var live = new DashboardLiveDto
        {
            OccupiedTables = tables.Count(t => t.Status == TableStatus.Occupied),
            TotalTables = tables.Count,
            OpenOrders = openOrders.Count,
            KitchenPending = openOrders.Count(o => o.InKitchen),
            LongestOpenTableName = longestOpen.Value is null ? null : tableNameById.GetValueOrDefault(longestOpen.Key),
            LongestOpenSince = longestOpen.Value?.Since,
        };

        // "Seni bekleyenler": QR sipariş istekleri, siteden gelen rezervasyon istekleri, sayımı yapılmamış vardiyalar.
        var orderRequests = await _db.OrderRequests
            .AsNoTracking()
            .Where(r => r.Status == OrderRequestStatus.Pending && tableIds.Contains(r.TableId))
            .OrderBy(r => r.CreatedAt)
            .Select(r => new { r.CreatedAt, TableName = r.Table.Name })
            .ToListAsync(cancellationToken);

        var reservationRequests = await _db.Reservations
            .AsNoTracking()
            .Where(r => r.Status == ReservationStatus.Pending && !r.IsDeleted && tableIds.Contains(r.TableId) && r.ReservationTime >= nowUtc)
            .OrderBy(r => r.ReservationTime)
            .Select(r => r.ReservationTime)
            .ToListAsync(cancellationToken);

        // Bir kasanın son vardiyası sayımsız kapandıysa ve yerine yenisi açılmadıysa sayım bekliyor demektir.
        var registers = await _db.CashRegisters
            .AsNoTracking()
            .Where(r => r.BranchId == branchId && !r.IsDeleted)
            .Select(r => new { r.Id, r.Name })
            .ToListAsync(cancellationToken);
        List<string> uncountedRegisters = [];
        foreach (var register in registers)
        {
            var last = await _db.Shifts
                .AsNoTracking()
                .Where(s => s.CashRegisterId == register.Id)
                .OrderByDescending(s => s.OpenedAt)
                .Select(s => new { s.Status, s.CountStatus })
                .FirstOrDefaultAsync(cancellationToken);
            if (last is { Status: ShiftStatus.Closed, CountStatus: ShiftCountStatus.NotCounted })
                uncountedRegisters.Add(register.Name);
        }

        var pending = new DashboardPendingDto
        {
            OrderRequests = orderRequests.Count,
            OldestOrderRequestAt = orderRequests.FirstOrDefault()?.CreatedAt,
            OrderRequestTables = orderRequests.Select(r => r.TableName).Distinct().Take(3).ToList(),
            ReservationRequests = reservationRequests.Count,
            ReservationRequestTimes = reservationRequests.Take(3).Select(t => ToLocal(t).ToString("d MMM HH:mm", Tr)).ToList(),
            UncountedShifts = uncountedRegisters.Count,
            UncountedRegisters = uncountedRegisters,
        };

        var lineItems = await _db.PaymentLineItems
            .AsNoTracking()
            .Where(l => l.Payment.CashRegister.BranchId == branchId && l.Payment.CreatedAt >= weekStart && l.Payment.CreatedAt < todayEnd)
            .Select(l => new { l.ProductName, l.Quantity, l.UnitPrice, l.Payment.CreatedAt })
            .ToListAsync(cancellationToken);

        List<DashboardTopProductDto> TopFrom(DateTime from) => lineItems
            .Where(l => l.CreatedAt >= from)
            .GroupBy(l => l.ProductName)
            .Select(g => new DashboardTopProductDto
            {
                Name = g.Key,
                Sold = g.Sum(l => l.Quantity),
                Revenue = g.Sum(l => l.Quantity * l.UnitPrice),
            })
            .OrderByDescending(p => p.Sold)
            .Take(5)
            .ToList();

        List<OverdueOrderItemDto> overdue = (await OverdueOrderItems.Candidates(_db, nowUtc)
                .AsNoTracking()
                .Where(i => i.Order.Table.Region.BranchId == branchId)
                .ToListAsync(cancellationToken))
            .Where(i => i.IsOverdue(nowUtc))
            .OrderBy(i => i.GetDueAt())
            .Select(i => i.ToOverdueDto())
            .ToList();

        return Result<DashboardDto>.Success(new DashboardDto
        {
            Overdue = overdue,
            GeneratedAt = nowUtc,
            Revenue = revenue,
            Live = live,
            Pending = pending,
            Regions = regions,
            Hourly = hourly,
            Reservations = reservations.Select(r => new DashboardReservationDto
            {
                Id = r.Id,
                Time = ToLocal(r.ReservationTime).ToString("HH:mm", CultureInfo.InvariantCulture),
                GuestName = r.GuestName,
                PartySize = r.PartySize,
                TableName = tableNameById.GetValueOrDefault(r.TableId, string.Empty),
                Status = r.Status,
            }).ToList(),
            TopToday = TopFrom(todayStart),
            TopWeek = TopFrom(weekStart),
        });
    }
}
