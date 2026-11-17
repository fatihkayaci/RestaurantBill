using System.Globalization;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.CustomerSite;

// Girişsiz (müşteri) uçların ortak kuralları: restoran slug'dan çözülür; rezervasyon kuralları şubenin ayarlarından gelir.
public static class CustomerSiteScope
{
    // Bitiş saati olmayan eski (personelin açtığı) kayıtların varsayılan süresi.
    public const int LegacyReservationDurationMinutes = 120;
    public const int MaxPendingOrderRequestsPerTable = 5;

    // Bir aralığı dolu sayan durumlar. Active: personelin açtığı, bitiş saati olmayan eski kayıt.
    public static readonly ReservationStatus[] BlockingStatuses =
        [ReservationStatus.Pending, ReservationStatus.Confirmed, ReservationStatus.Active];

    public static async Task<Company?> ResolveCompanyAsync(IAppDbContext db, ITenantResolver tenant, CancellationToken cancellationToken)
    {
        string? slug = tenant.Slug;
        if (string.IsNullOrWhiteSpace(slug))
            return null;

        // Kapatılan (silinmeyi bekleyen) şirketin sitesi, QR'ı ve sipariş sayfaları çalışmaz.
        return await db.Companies.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Slug == slug && !c.IsDeleted && c.ClosedAt == null, cancellationToken);
    }

    public const string ClosedRestaurantMessage = "Bu restoran artık hizmet vermiyor.";

    /// <summary>Slug'ın şirketi kapatılmış mı (müşteri sayfaları nötr "hizmet vermiyor" ekranını gösterir).</summary>
    public static async Task<bool> IsClosedAsync(IAppDbContext db, ITenantResolver tenant, CancellationToken cancellationToken)
    {
        string? slug = tenant.Slug;
        if (string.IsNullOrWhiteSpace(slug))
            return false;
        return await db.Companies.AsNoTracking().AnyAsync(c => c.Slug == slug && !c.IsDeleted && c.ClosedAt != null, cancellationToken);
    }

    // branchId verilmezse şirketin en eski şubesi.
    public static async Task<Branch?> ResolveBranchAsync(IAppDbContext db, Guid companyId, Guid? branchId, CancellationToken cancellationToken)
    {
        IQueryable<Branch> query = db.Branches.AsNoTracking().Where(b => b.CompanyId == companyId && !b.IsDeleted);

        if (branchId.HasValue && branchId.Value != Guid.Empty)
            return await query.FirstOrDefaultAsync(b => b.Id == branchId.Value, cancellationToken);

        return await query.OrderBy(b => b.CreatedAt).FirstOrDefaultAsync(cancellationToken);
    }

    public const string OrderingDisabledMessage = "Bu restoranda QR ile sipariş verilemiyor. Siparişiniz için lütfen garsona haber verin.";
    public const string CallWaiterDisabledMessage = "Bu restoranda QR ile garson çağrılamıyor.";
    public const string BillRequestDisabledMessage = "Bu restoranda QR ile hesap istenemiyor. Lütfen garsona haber verin.";
    public const string TableNotFoundMessage = "Bu masa bulunamadı. Lütfen garsona haber verin.";

    // Şubenin masa QR anahtarları; şube bulunamazsa ya da hiç kaydedilmemişse varsayılanlar (hepsi açık).
    public static async Task<QrFeatures> QrFeaturesOfAsync(IAppDbContext db, Guid branchId, CancellationToken cancellationToken)
    {
        QrFeatures? features = await db.Branches.AsNoTracking()
            .Where(b => b.Id == branchId)
            .Select(b => b.QrFeatures)
            .FirstOrDefaultAsync(cancellationToken);
        return features ?? QrFeatures.Default;
    }

    // Slug'ın şirketine ait, hizmet dışı olmayan masa (bölgesiyle). Yoksa null.
    public static async Task<Table?> ResolveTableAsync(IAppDbContext db, ITenantResolver tenant, Guid tableId, CancellationToken cancellationToken)
    {
        Company? company = await ResolveCompanyAsync(db, tenant, cancellationToken);
        if (company is null)
            return null;

        Table? table = await db.Tables
            .Include(t => t.Region)
            .FirstOrDefaultAsync(t => t.Id == tableId && t.Region.Branch.CompanyId == company.Id, cancellationToken);

        return table is null || table.Status == TableStatus.OutOfService ? null : table;
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

    public const string ReservationsClosedMessage = "Bu restoran şu anda online rezervasyon almıyor.";

    // "2026-11-14" + "19:30" (şubenin yerel saati) → UTC aralık. Şubenin rezervasyon ayarlarına göre: rezervasyon kapalıysa,
    // gün kapalıysa, saat o günün başlangıç saatlerinden biri değilse, geçmişteyse ya da çok ileri bir tarihse reddedilir.
    // Bitiş = başlangıç + ayarlardaki masada kalma süresi.
    public static string? TryResolveSlot(Branch branch, string date, string time, DateTime nowUtc, out DateTime startUtc, out DateTime endUtc)
        => TryResolveSlot(branch.GetReservationSettings(), branch.TimeZoneId, date, time, nowUtc, out startUtc, out endUtc);

    public static string? TryResolveSlot(ReservationSettings settings, string timeZoneId, string date, string time, DateTime nowUtc,
        out DateTime startUtc, out DateTime endUtc)
    {
        startUtc = default;
        endUtc = default;

        if (!settings.Enabled)
            return ReservationsClosedMessage;

        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly day)
            || !TimeOnly.TryParseExact(time, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out TimeOnly clock))
            return InvalidSlotMessage;

        DateTime local = DateTime.SpecifyKind(day.ToDateTime(clock), DateTimeKind.Unspecified);
        try
        {
            startUtc = TimeZoneInfo.ConvertTimeToUtc(local, ZoneOf(timeZoneId));
        }
        catch (ArgumentException)
        {
            return InvalidSlotMessage;
        }

        endUtc = startUtc.AddMinutes(settings.DurationMinutes);

        if (!settings.For(day.DayOfWeek).IsOpen)
            return $"{ReservationSettings.DayName(day.DayOfWeek)} günleri rezervasyon alınmıyor.";
        if (!settings.IsStartTime(day.DayOfWeek, clock))
            return "Bu saat için rezervasyon alınmıyor. Listeden bir saat seçin.";
        if (startUtc <= nowUtc)
            return "Geçmiş bir saat için rezervasyon yapılamaz.";
        if (startUtc > nowUtc.AddDays(settings.MaxDaysAhead))
            return $"En fazla {settings.MaxDaysAhead} gün sonrası için rezervasyon yapılabilir.";

        return null;
    }

    public const string InvalidSlotMessage = "Geçerli bir tarih ve saat seçin.";

    public static DateTime EndOf(Reservation reservation)
        => reservation.EndTime ?? reservation.ReservationTime.AddMinutes(LegacyReservationDurationMinutes);

    public static bool Overlaps(Reservation reservation, DateTime startUtc, DateTime endUtc)
        => reservation.ReservationTime < endUtc && EndOf(reservation) > startUtc;

    // Verilen masalarda [startUtc, endUtc) aralığıyla kesişen rezervasyonlar. Adaylar çekilip bellekte süzülür.
    public static async Task<List<Reservation>> FindOverlappingAsync(
        IAppDbContext db, IReadOnlyCollection<Guid> tableIds, DateTime startUtc, DateTime endUtc,
        IReadOnlyCollection<ReservationStatus> statuses, CancellationToken cancellationToken)
    {
        // En uzun masada kalma süresinden (4 saat) geniş tutulur.
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
