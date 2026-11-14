using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Persistence.Configurations;

public class BranchConfiguration : IEntityTypeConfiguration<Branch>
{
    public void Configure(EntityTypeBuilder<Branch> builder)
    {
        builder.Property(b => b.TaxRate)
            .HasPrecision(5, 2);

        builder.Property(b => b.Iban)
            .HasMaxLength(34)
            .HasDefaultValue(string.Empty);

        builder.Property(b => b.IbanHolderName)
            .HasMaxLength(Branch.IbanHolderNameMaxLength)
            .HasDefaultValue(string.Empty);

        // Rezervasyon ayarları tek bir jsonb sütununda; null = hiç ayarlanmamış (varsayılanlar).
        builder.Property(b => b.ReservationSettings)
            .HasColumnType("jsonb")
            .HasConversion(
                v => ReservationSettingsJson.Serialize(v!),
                s => ReservationSettingsJson.Deserialize(s),
                new ValueComparer<ReservationSettings?>(
                    (a, b) => ReservationSettingsJson.SerializeOrNull(a) == ReservationSettingsJson.SerializeOrNull(b),
                    v => (ReservationSettingsJson.SerializeOrNull(v) ?? string.Empty).GetHashCode(),
                    v => v));

        // Online sipariş ayarları da aynı biçimde; null = hiç ayarlanmamış (varsayılan: kapalı).
        builder.Property(b => b.OnlineOrderSettings)
            .HasColumnType("jsonb")
            .HasConversion(
                v => OnlineOrderSettingsJson.Serialize(v!),
                s => OnlineOrderSettingsJson.Deserialize(s),
                new ValueComparer<OnlineOrderSettings?>(
                    (a, b) => OnlineOrderSettingsJson.SerializeOrNull(a) == OnlineOrderSettingsJson.SerializeOrNull(b),
                    v => (OnlineOrderSettingsJson.SerializeOrNull(v) ?? string.Empty).GetHashCode(),
                    v => v));

        builder.Property(b => b.OnlineOrdersPaused)
            .HasDefaultValue(false);

        // Masa QR özellikleri de aynı biçimde; null = hiç ayarlanmamış (varsayılan: hepsi açık).
        builder.Property(b => b.QrFeatures)
            .HasColumnType("jsonb")
            .HasConversion(
                v => QrFeaturesJson.Serialize(v!),
                s => QrFeaturesJson.Deserialize(s),
                new ValueComparer<QrFeatures?>(
                    (a, b) => QrFeaturesJson.SerializeOrNull(a) == QrFeaturesJson.SerializeOrNull(b),
                    v => (QrFeaturesJson.SerializeOrNull(v) ?? string.Empty).GetHashCode(),
                    v => v));

        builder.Ignore(b => b.AcceptsOnlineOrders);
    }
}

// Saklanan şekil alan adlarıyla sabittir; alan adları domain'den bağımsız tutulur.
internal static class ReservationSettingsJson
{
    private sealed record StoredDay(int Day, bool Open, string First, string Last);

    private sealed record Stored(bool Enabled, int Interval, int Duration, int MaxDaysAhead, int MaxPartySize, List<StoredDay> Days);

    private const string TimeFormat = "HH:mm";

    public static string? SerializeOrNull(ReservationSettings? settings) => settings is null ? null : Serialize(settings);

    public static string Serialize(ReservationSettings settings)
        => JsonSerializer.Serialize(new Stored(
            settings.Enabled, settings.SlotIntervalMinutes, settings.DurationMinutes, settings.MaxDaysAhead, settings.MaxPartySize,
            settings.Days.Select(d => new StoredDay((int)d.Day, d.IsOpen,
                d.FirstStart.ToString(TimeFormat, CultureInfo.InvariantCulture),
                d.LastStart.ToString(TimeFormat, CultureInfo.InvariantCulture))).ToList()));

    public static ReservationSettings Deserialize(string json)
    {
        Stored stored = JsonSerializer.Deserialize<Stored>(json)!;
        return ReservationSettings.Restore(
            stored.Enabled, stored.Interval, stored.Duration, stored.MaxDaysAhead, stored.MaxPartySize,
            (stored.Days ?? []).Select(d => new ReservationDayHours((DayOfWeek)d.Day, d.Open,
                TimeOnly.ParseExact(d.First, TimeFormat, CultureInfo.InvariantCulture),
                TimeOnly.ParseExact(d.Last, TimeFormat, CultureInfo.InvariantCulture))));
    }
}

// Saklanan şekil alan adlarıyla sabittir; alan adları domain'den bağımsız tutulur.
internal static class OnlineOrderSettingsJson
{
    private sealed record StoredDay(int Day, bool Open, string Opens, string Closes);

    private sealed record Stored(bool Enabled, List<StoredDay> Days, int LastOrderMinutes, int EtaMinutes, int AutoRejectMinutes,
        int MaxOpenPerPhone, int MaxPerPhonePerDay, bool Cash, bool Card, bool RequirePhoneVerification, bool PreOrder, int PreOrderLeadMinutes);

    private const string TimeFormat = "HH:mm";

    public static string? SerializeOrNull(OnlineOrderSettings? settings) => settings is null ? null : Serialize(settings);

    public static string Serialize(OnlineOrderSettings settings)
        => JsonSerializer.Serialize(new Stored(
            settings.Enabled,
            settings.Days.Select(d => new StoredDay((int)d.Day, d.IsOpen,
                d.Opens.ToString(TimeFormat, CultureInfo.InvariantCulture),
                d.Closes.ToString(TimeFormat, CultureInfo.InvariantCulture))).ToList(),
            settings.LastOrderMinutesBeforeClose, settings.DefaultEtaMinutes, settings.AutoRejectAfterMinutes,
            settings.MaxOpenOrdersPerPhone, settings.MaxOrdersPerPhonePerDay, settings.AcceptCash, settings.AcceptCard,
            settings.RequirePhoneVerification, settings.PreOrderEnabled, settings.PreOrderLeadMinutes));

    public static OnlineOrderSettings Deserialize(string json)
    {
        Stored stored = JsonSerializer.Deserialize<Stored>(json)!;
        return OnlineOrderSettings.Restore(
            stored.Enabled,
            (stored.Days ?? []).Select(d => new OnlineOrderDayHours((DayOfWeek)d.Day, d.Open,
                TimeOnly.ParseExact(d.Opens, TimeFormat, CultureInfo.InvariantCulture),
                TimeOnly.ParseExact(d.Closes, TimeFormat, CultureInfo.InvariantCulture))),
            stored.LastOrderMinutes, stored.EtaMinutes, stored.AutoRejectMinutes,
            stored.MaxOpenPerPhone, stored.MaxPerPhonePerDay, stored.Cash, stored.Card,
            stored.RequirePhoneVerification, stored.PreOrder, stored.PreOrderLeadMinutes);
    }
}

// Saklanan şekil alan adlarıyla sabittir. Eksik alan (sonradan eklenen bir anahtar) açık sayılır.
internal static class QrFeaturesJson
{
    private sealed record Stored(bool? Ordering, bool? CallWaiter, bool? BillRequest, bool? DeliveryLink, bool? ReservationLink);

    public static string? SerializeOrNull(QrFeatures? features) => features is null ? null : Serialize(features);

    public static string Serialize(QrFeatures features)
        => JsonSerializer.Serialize(new Stored(
            features.OrderingEnabled, features.CallWaiterEnabled, features.BillRequestEnabled,
            features.DeliveryLinkEnabled, features.ReservationLinkEnabled));

    public static QrFeatures Deserialize(string json)
    {
        Stored stored = JsonSerializer.Deserialize<Stored>(json)!;
        return QrFeatures.Create(
            stored.Ordering ?? true, stored.CallWaiter ?? true, stored.BillRequest ?? true,
            stored.DeliveryLink ?? true, stored.ReservationLink ?? true);
    }
}
