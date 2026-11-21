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

        builder.Property(b => b.PaymentBankName)
            .HasMaxLength(Branch.PaymentBankNameMaxLength)
            .HasDefaultValue(string.Empty);

        // Masa QR'ında "IBAN ile öde": restoran açmadıkça kapalı.
        builder.Property(b => b.ShowIbanOnTable)
            .HasDefaultValue(false);

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

        // Şubenin site bilgileri (haftalık saat, WhatsApp, nasıl gelinir) SiteContent şeklinde tek jsonb sütununda; null = hiç
        // kaydedilmemiş. Sitenin geri kalanı şirkettedir (CompanyConfiguration).
        builder.Property(b => b.SiteContent)
            .HasColumnType("jsonb")
            .HasConversion(
                v => SiteContentJson.Serialize(v!),
                s => SiteContentJson.Deserialize(s),
                new ValueComparer<SiteContent?>(
                    (a, b) => SiteContentJson.SerializeOrNull(a) == SiteContentJson.SerializeOrNull(b),
                    v => (SiteContentJson.SerializeOrNull(v) ?? string.Empty).GetHashCode(),
                    v => v));

        builder.Ignore(b => b.AcceptsOnlineOrders);
    }
}

// Saklanan şekil alan adlarıyla sabittir; eksik alan (sonradan eklenen bir anahtar) boş sayılır.
internal static class SiteContentJson
{
    internal sealed record StoredDay(int Day, bool Open, string Opens, string Closes);
    internal sealed record StoredReview(string? Author, string? Text, string? Source);
    internal sealed record StoredValue(string? Title, string? Text);
    internal sealed record StoredMilestone(int Year, string? Text);
    internal sealed record StoredRegion(Guid Id, string? Photo, string? Text);

    internal sealed record Stored(
        string? Theme, List<string>? Gallery, List<StoredDay>? Week, string? Directions, string? Whatsapp, List<string>? Amenities,
        decimal? Rating, int? ReviewCount, string? ReviewsUrl, List<StoredReview>? Reviews,
        string? FounderPhoto, string? FounderName, string? FounderTitle, string? FounderQuote, int? Founded,
        List<StoredValue>? Values, List<StoredMilestone>? Milestones, List<StoredRegion>? Regions,
        string? SeoTitle = null, string? SeoDescription = null, string? ShareImage = null,
        string? MenuHero = null, string? AboutHero = null, string? VenueHero = null, string? ContactHero = null, string? ReservationHero = null,
        List<string>? HiddenFaqs = null, string? Design = null, string? Font = null);

    private const string TimeFormat = "HH:mm";

    public static string? SerializeOrNull(SiteContent? content) => content is null ? null : Serialize(content);

    public static string Serialize(SiteContent c) => JsonSerializer.Serialize(ToStored(c));

    internal static Stored ToStored(SiteContent c)
        => new(
            c.Theme,
            [.. c.GalleryImages],
            c.WeeklyHours.Select(d => new StoredDay((int)d.Day, d.IsOpen,
                d.Opens.ToString(TimeFormat, CultureInfo.InvariantCulture),
                d.Closes.ToString(TimeFormat, CultureInfo.InvariantCulture))).ToList(),
            c.DirectionsNote, c.WhatsappPhone, [.. c.Amenities],
            c.Rating, c.ReviewCount, c.ReviewsUrl,
            c.FeaturedReviews.Select(r => new StoredReview(r.Author, r.Text, r.Source)).ToList(),
            c.FounderPhoto, c.FounderName, c.FounderTitle, c.FounderQuote, c.FoundedYear,
            c.Values.Select(v => new StoredValue(v.Title, v.Text)).ToList(),
            c.Milestones.Select(m => new StoredMilestone(m.Year, m.Text)).ToList(),
            c.RegionDetails.Select(r => new StoredRegion(r.RegionId, r.PhotoKey, r.Description)).ToList(),
            c.SeoTitle, c.SeoDescription, c.ShareImage,
            c.MenuHero, c.AboutHero, c.VenueHero, c.ContactHero, c.ReservationHero,
            [.. c.HiddenFaqs], c.Design, c.Font);

    public static SiteContent Deserialize(string json) => FromStored(JsonSerializer.Deserialize<Stored>(json)!);

    internal static SiteContent FromStored(Stored s)
    {
        return new SiteContent
        {
            Theme = s.Theme ?? string.Empty,
            Design = s.Design ?? string.Empty,
            Font = s.Font ?? string.Empty,
            GalleryImages = s.Gallery ?? [],
            WeeklyHours = (s.Week ?? []).Select(d => new SiteDayHours((DayOfWeek)d.Day, d.Open,
                TimeOnly.ParseExact(d.Opens, TimeFormat, CultureInfo.InvariantCulture),
                TimeOnly.ParseExact(d.Closes, TimeFormat, CultureInfo.InvariantCulture))).ToList(),
            DirectionsNote = s.Directions ?? string.Empty,
            WhatsappPhone = s.Whatsapp ?? string.Empty,
            Amenities = s.Amenities ?? [],
            HiddenFaqs = s.HiddenFaqs ?? [],
            Rating = s.Rating,
            ReviewCount = s.ReviewCount,
            ReviewsUrl = s.ReviewsUrl ?? string.Empty,
            FeaturedReviews = (s.Reviews ?? []).Select(r => new SiteReview(r.Author ?? string.Empty, r.Text ?? string.Empty, r.Source ?? string.Empty)).ToList(),
            FounderPhoto = s.FounderPhoto ?? string.Empty,
            FounderName = s.FounderName ?? string.Empty,
            FounderTitle = s.FounderTitle ?? string.Empty,
            FounderQuote = s.FounderQuote ?? string.Empty,
            FoundedYear = s.Founded,
            Values = (s.Values ?? []).Select(v => new SiteValue(v.Title ?? string.Empty, v.Text ?? string.Empty)).ToList(),
            Milestones = (s.Milestones ?? []).Select(m => new SiteMilestone(m.Year, m.Text ?? string.Empty)).ToList(),
            RegionDetails = (s.Regions ?? []).Select(r => new SiteRegionDetail(r.Id, r.Photo ?? string.Empty, r.Text ?? string.Empty)).ToList(),
            SeoTitle = s.SeoTitle ?? string.Empty,
            SeoDescription = s.SeoDescription ?? string.Empty,
            ShareImage = s.ShareImage ?? string.Empty,
            MenuHero = s.MenuHero ?? string.Empty,
            AboutHero = s.AboutHero ?? string.Empty,
            VenueHero = s.VenueHero ?? string.Empty,
            ContactHero = s.ContactHero ?? string.Empty,
            ReservationHero = s.ReservationHero ?? string.Empty,
        };
    }
}

// Şirketin sitesi (yayındaki ve taslak): sitenin sütun alanları + ek içerik (SiteContentJson ile aynı şekil, "Content" altında).
// Eksik alan boş sayılır. Şekil, 20261119 göçünden önceki şube taslağıyla (Branches.SiteDraft) aynıdır.
internal static class SiteDraftJson
{
    private sealed record Stored(
        string? Headline, string? Tagline, string? StoryTitle, string? About, string? Cover, string? AboutImage,
        string? Opens, string? Closes, string? HoursNote, string? Instagram, string? Accent, SiteContentJson.Stored? Content, string? Logo = null);

    private const string TimeFormat = "HH:mm";

    public static string? SerializeOrNull(SiteSnapshot? draft) => draft is null ? null : Serialize(draft);

    public static string Serialize(SiteSnapshot d)
        => JsonSerializer.Serialize(new Stored(
            d.Headline, d.Tagline, d.StoryTitle, d.About, d.CoverImage, d.AboutImage,
            d.OpensAt?.ToString(TimeFormat, CultureInfo.InvariantCulture), d.ClosesAt?.ToString(TimeFormat, CultureInfo.InvariantCulture),
            d.HoursNote, d.InstagramUrl, d.AccentColor, SiteContentJson.ToStored(d.Content), d.LogoImage));

    public static SiteSnapshot Deserialize(string json)
    {
        Stored s = JsonSerializer.Deserialize<Stored>(json)!;
        return new SiteSnapshot
        {
            Headline = s.Headline ?? string.Empty,
            Tagline = s.Tagline ?? string.Empty,
            StoryTitle = s.StoryTitle ?? string.Empty,
            About = s.About ?? string.Empty,
            CoverImage = s.Cover ?? string.Empty,
            AboutImage = s.AboutImage ?? string.Empty,
            LogoImage = s.Logo ?? string.Empty,
            OpensAt = string.IsNullOrEmpty(s.Opens) ? null : TimeOnly.ParseExact(s.Opens, TimeFormat, CultureInfo.InvariantCulture),
            ClosesAt = string.IsNullOrEmpty(s.Closes) ? null : TimeOnly.ParseExact(s.Closes, TimeFormat, CultureInfo.InvariantCulture),
            HoursNote = s.HoursNote ?? string.Empty,
            InstagramUrl = s.Instagram ?? string.Empty,
            AccentColor = s.Accent ?? string.Empty,
            Content = s.Content is null ? SiteContent.Empty : SiteContentJson.FromStored(s.Content),
        };
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

// Saklanan şekil alan adlarıyla sabittir; alan adları domain'den bağımsız tutulur. Iban ve Pickup sonradan eklendi: eski kayıtta
// yok, kapalı sayılır (gel al hazır olma süresi yoksa varsayılan).
internal static class OnlineOrderSettingsJson
{
    private sealed record StoredDay(int Day, bool Open, string Opens, string Closes);

    private sealed record Stored(bool Enabled, List<StoredDay> Days, int LastOrderMinutes, int EtaMinutes, int AutoRejectMinutes,
        int MaxOpenPerPhone, int MaxPerPhonePerDay, bool Cash, bool Card, bool RequirePhoneVerification, bool PreOrder, int PreOrderLeadMinutes,
        bool Iban = false, bool Pickup = false, int? PickupEtaMinutes = null);

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
            settings.RequirePhoneVerification, settings.PreOrderEnabled, settings.PreOrderLeadMinutes, settings.AcceptIban,
            settings.PickupEnabled, settings.PickupEtaMinutes));

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
            stored.RequirePhoneVerification, stored.PreOrder, stored.PreOrderLeadMinutes, stored.Iban,
            stored.Pickup, stored.PickupEtaMinutes ?? OnlineOrderSettings.DefaultPickupEta);
    }
}

// Saklanan şekil alan adlarıyla sabittir. Eksik alan (sonradan eklenen bir anahtar) açık sayılır.
internal static class QrFeaturesJson
{
    // Featured ve Popular sonradan eklendi: eski kayıtta yok, varsayılan (öne çıkanlar açık, popüler kapalı).
    private sealed record Stored(bool? Ordering, bool? CallWaiter, bool? BillRequest, bool? DeliveryLink, bool? ReservationLink,
        bool? Featured = null, bool? Popular = null);

    public static string? SerializeOrNull(QrFeatures? features) => features is null ? null : Serialize(features);

    public static string Serialize(QrFeatures features)
        => JsonSerializer.Serialize(new Stored(
            features.OrderingEnabled, features.CallWaiterEnabled, features.BillRequestEnabled,
            features.DeliveryLinkEnabled, features.ReservationLinkEnabled, features.FeaturedSectionEnabled, features.PopularSectionEnabled));

    public static QrFeatures Deserialize(string json)
    {
        Stored stored = JsonSerializer.Deserialize<Stored>(json)!;
        return QrFeatures.Create(
            stored.Ordering ?? true, stored.CallWaiter ?? true, stored.BillRequest ?? true,
            stored.DeliveryLink ?? true, stored.ReservationLink ?? true,
            stored.Featured ?? QrFeatures.Default.FeaturedSectionEnabled, stored.Popular ?? QrFeatures.Default.PopularSectionEnabled);
    }
}
