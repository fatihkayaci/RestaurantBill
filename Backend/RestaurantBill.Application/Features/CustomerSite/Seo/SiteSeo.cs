using System.Globalization;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.CustomerSite.Seo;

/// <summary>Sitenin Google/paylaşım değerleri: girilen ya da otomatik. Görsel depo anahtarıdır (boş olabilir).</summary>
public sealed record SiteSeoValues(
    string RestaurantName,
    string Title,
    string Description,
    string ShareImageKey,
    string AutoTitle,
    string AutoDescription,
    string AutoShareImageKey);

/// <summary>Sayfa yolu için başlık ve arama motorlarına kapalı olup olmadığı (kişisel bağlantılar: rezervasyon, takip, masa).</summary>
public sealed record SitePageTitle(string Title, bool NoIndex);

// Restoran sitesinin Google ve paylaşım (WhatsApp/Instagram) değerleri. Boş alan otomatik değerle dolar:
//   başlık   = "<Restoran adı> · <ilçe>"
//   açıklama = "<alt başlık> · <ilçe> · <saatler>" (sunucuda kırpılmaz; ön yüz 155 karakter üstünü uyarır)
//   görsel   = kapak fotoğrafı (yoksa ilk mekân fotoğrafı)
public static class SiteSeo
{
    private const string Separator = " · ";

    public static string RestaurantName(string companyName, string branchName)
        => string.IsNullOrWhiteSpace(companyName) ? branchName.Trim() : companyName.Trim();

    public static string AutoTitle(string restaurantName, string district)
        => string.IsNullOrWhiteSpace(district) ? restaurantName : restaurantName + Separator + district.Trim();

    public static string AutoDescription(SiteSnapshot site, string restaurantName, string district)
    {
        string lead = site.Tagline.Length > 0 ? site.Tagline : site.Headline;
        string[] parts = [lead.Trim(), district?.Trim() ?? string.Empty, HoursLine(site)];
        string description = string.Join(Separator, parts.Where(p => p.Length > 0));
        // Hiçbir şey girilmemişse yalnız ilçe/saat kalmasın: ad ve sitenin ne sunduğu.
        if (lead.Trim().Length == 0)
            description = string.Join(Separator, new[] { restaurantName, description, "Menü, saatler ve iletişim" }.Where(p => p.Length > 0));
        return description;
    }

    public static string AutoShareImageKey(SiteSnapshot site)
        => site.CoverImage.Length > 0 ? site.CoverImage : site.Content.GalleryImages.FirstOrDefault() ?? string.Empty;

    /// <summary>
    /// Saatlerin tek satırı: "Her gün 08:00–23:00", "Salı–Pazar 12:00–23:00", "Pazartesi–Cuma 09:00–22:00, Cumartesi 10:00–23:00".
    /// Haftalık saat yoksa tek aralık; o da yoksa boş.
    /// </summary>
    public static string HoursLine(SiteSnapshot site)
    {
        IReadOnlyList<SiteDayHours> week = site.Content.WeeklyHours;
        if (week.Count == 0)
            return site.OpensAt is TimeOnly o && site.ClosesAt is TimeOnly c ? "Her gün " + Range(o, c) : string.Empty;

        // Pazartesi → Pazar sırasıyla aynı aralıktaki ardışık günler bir grup olur; kapalı günler yazılmaz.
        List<(DayOfWeek First, DayOfWeek Last, SiteDayHours Hours)> groups = [];
        foreach (SiteDayHours day in week)
        {
            if (groups.Count > 0 && SameHours(groups[^1].Hours, day))
                groups[^1] = (groups[^1].First, day.Day, groups[^1].Hours);
            else
                groups.Add((day.Day, day.Day, day));
        }

        var open = groups.Where(g => g.Hours.IsOpen).ToList();
        if (open.Count == 1 && groups.Count == 1)
            return "Her gün " + Range(open[0].Hours.Opens, open[0].Hours.Closes);

        return string.Join(", ", open.Select(g =>
        {
            string days = g.First == g.Last
                ? ReservationSettings.DayName(g.First)
                : ReservationSettings.DayName(g.First) + "–" + ReservationSettings.DayName(g.Last);
            return days + " " + Range(g.Hours.Opens, g.Hours.Closes);
        }));
    }

    public static SiteSeoValues Resolve(SiteSnapshot site, string companyName, string branchName, string district)
    {
        string name = RestaurantName(companyName, branchName);
        string autoTitle = AutoTitle(name, district);
        string autoDescription = AutoDescription(site, name, district);
        string autoImage = AutoShareImageKey(site);
        SiteContent c = site.Content;
        return new SiteSeoValues(
            name,
            c.SeoTitle.Trim().Length > 0 ? c.SeoTitle.Trim() : autoTitle,
            c.SeoDescription.Trim().Length > 0 ? c.SeoDescription.Trim() : autoDescription,
            c.ShareImage.Length > 0 ? c.ShareImage : autoImage,
            autoTitle,
            autoDescription,
            autoImage);
    }

    public static SiteSeoDto ToDto(SiteSeoValues values, string cdnBaseUrl) => new()
    {
        Title = values.Title,
        Description = values.Description,
        ShareImageUrl = BranchSiteDto.ImageUrl(cdnBaseUrl, values.ShareImageKey),
    };

    /// <summary>Müşteri sitesinin bilinen sayfaları (ön yüz App.tsx) ve başlıkları. Anasayfa: sitenin başlığı.</summary>
    public static readonly IReadOnlyList<(string Path, string Label)> Pages =
    [
        ("/menu", "Menü"),
        ("/hakkimizda", "Hakkımızda"),
        ("/mekan", "Mekân"),
        ("/iletisim", "İletişim"),
        ("/rezervasyon", "Rezervasyon"),
        ("/siparis", "Paket sipariş"),
    ];

    /// <summary>Yolun başlığı. Bilinmeyen yol (personel ekranları vb.) sitenin başlığını alır ve dizine kapalıdır.</summary>
    public static SitePageTitle PageTitle(string? path, string restaurantName, string siteTitle)
    {
        string p = NormalizePath(path).ToLowerInvariant();
        if (p == "/") return new SitePageTitle(siteTitle, false);

        foreach ((string page, string label) in Pages)
        {
            if (p == page) return new SitePageTitle(label + Separator + restaurantName, false);
        }

        // Kişisel bağlantılar: başlık var ama Google'a girmesin.
        if (p == "/rezervasyon-sorgula") return new SitePageTitle("Rezervasyon sorgula" + Separator + restaurantName, true);
        if (p.StartsWith("/rezervasyon/", StringComparison.Ordinal)) return new SitePageTitle("Rezervasyonunuz" + Separator + restaurantName, true);
        if (p.StartsWith("/siparis/takip/", StringComparison.Ordinal)) return new SitePageTitle("Sipariş takibi" + Separator + restaurantName, true);
        if (p.StartsWith("/masa/", StringComparison.Ordinal)) return new SitePageTitle("Masadan sipariş" + Separator + restaurantName, true);
        return new SitePageTitle(siteTitle, true);
    }

    /// <summary>"/menu/?x=1#a" → "/menu"; boş → "/". Büyük/küçük harf korunur (bağlantı anahtarları).</summary>
    public static string NormalizePath(string? path)
    {
        string p = (path ?? string.Empty).Trim();
        int cut = p.IndexOfAny(['?', '#']);
        if (cut >= 0) p = p[..cut];
        return "/" + p.Trim('/');
    }

    private static bool SameHours(SiteDayHours a, SiteDayHours b)
        => a.IsOpen == b.IsOpen && (!a.IsOpen || (a.Opens == b.Opens && a.Closes == b.Closes));

    private static string Range(TimeOnly opens, TimeOnly closes) => opens == closes
        ? "24 saat açık"
        : opens.ToString("HH:mm", CultureInfo.InvariantCulture) + "–" + closes.ToString("HH:mm", CultureInfo.InvariantCulture);
}
