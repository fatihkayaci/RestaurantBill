using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
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
                r.Id, r.Status, r.TableId, r.GuestName, r.Contact, r.Note, r.PartySize, r.ReservationTime, r.EndTime, r.CreatedAt,
                TableName = r.Table.Name,
                RegionName = r.Table.Region.Name,
                r.Table.Region.Branch.TimeZoneId
            })
            .ToListAsync(cancellationToken);

        List<StaffReservationDto> result = rows.Select(r =>
        {
            TimeZoneInfo zone = CustomerSiteScope.ZoneOf(r.TimeZoneId);
            return new StaffReservationDto
            {
                Id = r.Id,
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

        await db.SaveChangesAsync(cancellationToken);
        await tableNotifications.SendCustomerRequestsChangedAsync(reservation.Table.Region.BranchId);
        return Result.Success();
    }
}
