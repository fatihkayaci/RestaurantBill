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
