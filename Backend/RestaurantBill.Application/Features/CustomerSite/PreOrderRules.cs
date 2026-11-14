using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.CustomerSite;

/// <summary>
/// Rezervasyon ön siparişinin ortak kuralları. Pencere: rezervasyon saati − PreOrderLeadMinutes ile rezervasyon saati +
/// <see cref="CloseAfterMinutes"/> arası, yalnızca onaylı rezervasyonda ve şubede ön sipariş açıkken. Misafir oturunca
/// (Seated) pencere kapanır. Ön sipariş mutfağa ancak personel "Geldi" ya da "Mutfağa şimdi gönder" deyince gider.
/// </summary>
public static class PreOrderRules
{
    public const int CloseAfterMinutes = 30;

    public const string NotFoundMessage = "Rezervasyon bulunamadı. Bağlantıyı kontrol edin.";
    public const string DisabledMessage = "Bu restoran şu an ön sipariş almıyor.";
    public const string NotConfirmedMessage = "Rezervasyonunuz onaylandığında ön sipariş verebilirsiniz.";
    public const string SeatedMessage = "Masanıza oturdunuz; siparişinizi garsona iletebilirsiniz.";
    public const string ClosedReservationMessage = "Bu rezervasyon için ön sipariş verilemez.";
    public const string WindowPassedMessage = "Ön sipariş süresi doldu.";

    public sealed record Window(DateTime OpensAtUtc, DateTime ClosesAtUtc, bool CanPreOrder, string? Reason, bool Enabled);

    public static Window Evaluate(Reservation reservation, OnlineOrderSettings settings, DateTime nowUtc, TimeZoneInfo zone)
    {
        DateTime opens = reservation.ReservationTime.AddMinutes(-settings.PreOrderLeadMinutes);
        DateTime closes = reservation.ReservationTime.AddMinutes(CloseAfterMinutes);

        string? reason = null;
        if (!settings.PreOrderEnabled)
            reason = DisabledMessage;
        else if (reservation.Status == ReservationStatus.Pending)
            reason = NotConfirmedMessage;
        else if (reservation.Status == ReservationStatus.Seated)
            reason = SeatedMessage;
        else if (reservation.Status != ReservationStatus.Confirmed)
            reason = ClosedReservationMessage;
        else if (nowUtc < opens)
            reason = OpensAtMessage(opens, zone);
        else if (nowUtc > closes)
            reason = WindowPassedMessage;

        return new Window(opens, closes, reason is null, reason, settings.PreOrderEnabled);
    }

    /// <summary>"Ön siparişinizi 18:30'dan itibaren verebilirsiniz." (saat şubenin yerel saatiyle, ek okunuşa göre).</summary>
    public static string OpensAtMessage(DateTime opensAtUtc, TimeZoneInfo zone)
    {
        string time = CustomerSiteScope.LocalTime(opensAtUtc, zone);
        return $"Ön siparişinizi {time}'{AblativeSuffix(time)} itibaren verebilirsiniz.";
    }

    /// <summary>
    /// "HH:mm" saatinin okunuşuna göre ayrılma hâli eki: 18:30 → "dan" (otuz), 19:00 → "dan" (on dokuz), 20:15 → "ten"
    /// (on beş), 17:40 → "tan" (kırk). Dakika 00 ise saat okunur.
    /// </summary>
    public static string AblativeSuffix(string time)
    {
        string[] parts = time.Split(':');
        int hour = int.Parse(parts[0], System.Globalization.CultureInfo.InvariantCulture);
        int minute = parts.Length > 1 ? int.Parse(parts[1], System.Globalization.CultureInfo.InvariantCulture) : 0;
        return SuffixFor(minute != 0 ? minute : hour);
    }

    private static string SuffixFor(int number)
    {
        if (number == 0) return "dan"; // sıfır
        return (number % 10) switch
        {
            1 or 2 or 7 or 8 => "den",   // bir, iki, yedi, sekiz
            3 or 4 or 5 => "ten",        // üç, dört, beş
            6 or 9 => "dan",             // altı, dokuz
            _ => (number / 10 % 10) switch
            {
                1 or 3 => "dan",         // on, otuz
                2 or 5 => "den",         // yirmi, elli
                4 => "tan",              // kırk
                _ => "dan"
            }
        };
    }

    /// <summary>"Ön sipariş · Rezervasyon Ahmet Yılmaz 19:30" — personelin masada ve mutfakta gördüğü etiket.</summary>
    public static string StaffLabel(Reservation reservation, TimeZoneInfo zone)
        => $"Ön sipariş · Rezervasyon {reservation.GuestName} {CustomerSiteScope.LocalTime(reservation.ReservationTime, zone)}";

    /// <summary>Rezervasyonun bekleyen ön siparişi (kalemleriyle); yoksa null.</summary>
    public static Task<OrderRequest?> FindPendingAsync(IAppDbContext db, Guid reservationId, CancellationToken cancellationToken)
        => db.OrderRequests
            .Include(r => r.Items)
            .Where(r => r.ReservationId == reservationId && r.Kind == OrderRequestKind.PreOrder && r.Status == OrderRequestStatus.Pending)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

    /// <summary>Rezervasyon iptal/ret/gelmedi olduğunda bekleyen ön siparişi iptal eder. İptal edilen varsa true.</summary>
    public static async Task<bool> CancelPendingAsync(IAppDbContext db, Guid reservationId, CancellationToken cancellationToken)
    {
        List<OrderRequest> pending = await db.OrderRequests
            .Where(r => r.ReservationId == reservationId && r.Kind == OrderRequestKind.PreOrder && r.Status == OrderRequestStatus.Pending)
            .ToListAsync(cancellationToken);
        foreach (OrderRequest preOrder in pending)
            preOrder.Cancel();
        return pending.Count > 0;
    }
}
