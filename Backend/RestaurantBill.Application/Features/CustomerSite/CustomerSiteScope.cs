using System.Globalization;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.CustomerSite;

// Girişsiz (müşteri) uçların ortak kuralları: restoran slug'dan çözülür, rezervasyon aralığı sabit sürelidir.
public static class CustomerSiteScope
{
    public const int ReservationDurationMinutes = 120;
    public const int MaxReservationDaysAhead = 60;
    public const int MaxPendingOrderRequestsPerTable = 5;

    // Bir aralığı dolu sayan durumlar. Active: personelin açtığı, bitiş saati olmayan eski kayıt.
    public static readonly ReservationStatus[] BlockingStatuses =
        [ReservationStatus.Pending, ReservationStatus.Confirmed, ReservationStatus.Active];

    public static async Task<Company?> ResolveCompanyAsync(IAppDbContext db, ITenantResolver tenant, CancellationToken cancellationToken)
    {
        string? slug = tenant.Slug;
        if (string.IsNullOrWhiteSpace(slug))
            return null;

        return await db.Companies.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Slug == slug && !c.IsDeleted, cancellationToken);
    }

    // branchId verilmezse şirketin en eski şubesi.
    public static async Task<Branch?> ResolveBranchAsync(IAppDbContext db, Guid companyId, Guid? branchId, CancellationToken cancellationToken)
    {
        IQueryable<Branch> query = db.Branches.AsNoTracking().Where(b => b.CompanyId == companyId && !b.IsDeleted);

        if (branchId.HasValue && branchId.Value != Guid.Empty)
            return await query.FirstOrDefaultAsync(b => b.Id == branchId.Value, cancellationToken);

        return await query.OrderBy(b => b.CreatedAt).FirstOrDefaultAsync(cancellationToken);
    }

    public static TimeZoneInfo ZoneOf(string timeZoneId)
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return TimeZoneInfo.Utc;
        }
    }

    // "2026-11-14" + "19:30" (şubenin yerel saati) → UTC aralık. Geçmiş ya da çok ileri tarihler reddedilir.
    public static string? TryResolveSlot(string timeZoneId, string date, string time, DateTime nowUtc, out DateTime startUtc, out DateTime endUtc)
    {
        startUtc = default;
        endUtc = default;

        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly day)
            || !TimeOnly.TryParseExact(time, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out TimeOnly clock))
            return "Geçerli bir tarih ve saat seçin.";

        DateTime local = DateTime.SpecifyKind(day.ToDateTime(clock), DateTimeKind.Unspecified);
        try
        {
            startUtc = TimeZoneInfo.ConvertTimeToUtc(local, ZoneOf(timeZoneId));
        }
        catch (ArgumentException)
        {
            return "Geçerli bir tarih ve saat seçin.";
        }

        endUtc = startUtc.AddMinutes(ReservationDurationMinutes);

        if (startUtc <= nowUtc)
            return "Geçmiş bir saat için rezervasyon yapılamaz.";
        if (startUtc > nowUtc.AddDays(MaxReservationDaysAhead))
            return $"En fazla {MaxReservationDaysAhead} gün sonrası için rezervasyon yapılabilir.";

        return null;
    }

    public static DateTime EndOf(Reservation reservation)
        => reservation.EndTime ?? reservation.ReservationTime.AddMinutes(ReservationDurationMinutes);

    public static bool Overlaps(Reservation reservation, DateTime startUtc, DateTime endUtc)
        => reservation.ReservationTime < endUtc && EndOf(reservation) > startUtc;

    // Verilen masalarda [startUtc, endUtc) aralığıyla kesişen rezervasyonlar. Adaylar çekilip bellekte süzülür.
    public static async Task<List<Reservation>> FindOverlappingAsync(
        IAppDbContext db, IReadOnlyCollection<Guid> tableIds, DateTime startUtc, DateTime endUtc,
        IReadOnlyCollection<ReservationStatus> statuses, CancellationToken cancellationToken)
    {
        DateTime earliestStart = startUtc.AddHours(-12);

        List<Reservation> candidates = await db.Reservations.AsNoTracking()
            .Where(r => tableIds.Contains(r.TableId)
                && statuses.Contains(r.Status)
                && r.ReservationTime < endUtc
                && r.ReservationTime > earliestStart)
            .ToListAsync(cancellationToken);

        return candidates.Where(r => Overlaps(r, startUtc, endUtc)).ToList();
    }

    public static string LocalDate(DateTime utc, TimeZoneInfo zone)
        => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), zone).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    public static string LocalTime(DateTime utc, TimeZoneInfo zone)
        => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), zone).ToString("HH:mm", CultureInfo.InvariantCulture);
}
