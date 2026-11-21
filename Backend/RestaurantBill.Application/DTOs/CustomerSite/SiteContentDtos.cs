using System.Globalization;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.DTOs.CustomerSite;

// Şubenin site içeriği. Admin "Restoran sitesi" sayfasında da aynı şekil kullanılır (görseller tam adresle).
public class BranchSiteDto
{
    public string Headline { get; set; } = string.Empty;
    public string Tagline { get; set; } = string.Empty;
    public string StoryTitle { get; set; } = string.Empty;
    public string About { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public string AboutImageUrl { get; set; } = string.Empty;
    /// <summary>"HH:mm" ya da null. Haftalık saat girildiyse en sık görülen aralık (eski istemciler ve varsayılanlar için).</summary>
    public string? OpensAt { get; set; }
    public string? ClosesAt { get; set; }
    public string HoursNote { get; set; } = string.Empty;
    public string InstagramUrl { get; set; } = string.Empty;
    /// <summary>"#RRGGBB"; boşsa temanın vurgu rengi.</summary>
    public string AccentColor { get; set; } = string.Empty;

    /// <summary>Hazır renk teması ("terracotta", "zeytin", "lacivert", "bordo", "komur", "beyaz"); boş = terracotta.</summary>
    public string Theme { get; set; } = string.Empty;
    /// <summary>Sitenin tasarımı (SiteContent.DesignKeys); boş = varsayılan (sophra). Renk teması her tasarımda ayrı çizilir.</summary>
    public string Design { get; set; } = string.Empty;
    /// <summary>Yazı tipi çifti (SiteContent.FontKeys, ör. "playfair-inter"); boş = tasarımın kendi yazı tipi.</summary>
    public string Font { get; set; } = string.Empty;
    /// <summary>Mekân fotoğrafları (tam adres), sitedeki sırayla; en çok 12.</summary>
    public List<string> GalleryImageUrls { get; set; } = [];
    /// <summary>Boş: "her gün aynı" (OpensAt/ClosesAt). Doluysa Pazartesi → Pazar 7 gün.</summary>
    public List<SiteDayHoursDto> WeeklyHours { get; set; } = [];
    /// <summary>"Nasıl gelinir" kısa metni.</summary>
    public string DirectionsNote { get; set; } = string.Empty;
    public string WhatsappPhone { get; set; } = string.Empty;
    /// <summary>Hazır listeden olanak anahtarları ("avlu", "otopark", "vale"...).</summary>
    public List<string> Amenities { get; set; } = [];
    /// <summary>Sitede gizlenen hazır "Sık sorulanlar" anahtarları ("rezervasyon", "otopark"...); boş = hepsi görünür.</summary>
    public List<string> HiddenFaqs { get; set; } = [];
    /// <summary>Anasayfa bölümlerinin sırası ve görünürlüğü (SiteContent.HomeSectionKeys); boş = varsayılan sıra, hepsi açık.</summary>
    public List<SiteHomeSectionDto> HomeSections { get; set; } = [];
    public decimal? Rating { get; set; }
    public int? ReviewCount { get; set; }
    /// <summary>Google Haritalar (ya da başka) yorum sayfası.</summary>
    public string ReviewsUrl { get; set; } = string.Empty;
    public List<SiteReviewDto> FeaturedReviews { get; set; } = [];
    public string FounderPhotoUrl { get; set; } = string.Empty;
    public string FounderName { get; set; } = string.Empty;
    public string FounderTitle { get; set; } = string.Empty;
    public string FounderQuote { get; set; } = string.Empty;
    public int? FoundedYear { get; set; }
    public List<SiteValueDto> Values { get; set; } = [];
    public List<SiteMilestoneDto> Milestones { get; set; } = [];
    /// <summary>Yalnız admin: şubenin bütün bölümleri, fotoğraf ve açıklamasıyla. Sitede bu bilgi regions[] içindedir.</summary>
    public List<SiteRegionDetailDto> RegionDetails { get; set; } = [];
    /// <summary>Girilen Google/paylaşım başlığı; boş = otomatik. Geçerli değer için PublicSiteDto.Seo / SiteEditorDto.Seo.</summary>
    public string SeoTitle { get; set; } = string.Empty;
    public string SeoDescription { get; set; } = string.Empty;
    /// <summary>Seçilen paylaşım görseli (tam adres); boş = kapak fotoğrafı kullanılır.</summary>
    public string ShareImageUrl { get; set; } = string.Empty;
    // Alt sayfaların kendi kapakları (tam adres); boş = kapak (Mekân'da galeri → hikâye → kapak).
    public string MenuHeroUrl { get; set; } = string.Empty;
    public string AboutHeroUrl { get; set; } = string.Empty;
    public string VenueHeroUrl { get; set; } = string.Empty;
    public string ContactHeroUrl { get; set; } = string.Empty;
    public string ReservationHeroUrl { get; set; } = string.Empty;

    public static string ImageUrl(string cdnBaseUrl, string? key) => string.IsNullOrWhiteSpace(key) ? string.Empty : $"{cdnBaseUrl}/{key}";

    /// <summary>Verilen hâl (yayındaki ya da taslak).</summary>
    public static BranchSiteDto From(SiteSnapshot site, string cdnBaseUrl)
    {
        SiteContent content = site.Content;
        return new BranchSiteDto
        {
            Headline = site.Headline,
            Tagline = site.Tagline,
            StoryTitle = site.StoryTitle,
            About = site.About,
            CoverImageUrl = ImageUrl(cdnBaseUrl, site.CoverImage),
            AboutImageUrl = ImageUrl(cdnBaseUrl, site.AboutImage),
            OpensAt = site.OpensAt?.ToString("HH:mm", CultureInfo.InvariantCulture),
            ClosesAt = site.ClosesAt?.ToString("HH:mm", CultureInfo.InvariantCulture),
            HoursNote = site.HoursNote,
            InstagramUrl = site.InstagramUrl,
            AccentColor = site.AccentColor,
            Theme = content.Theme,
            Design = content.Design,
            Font = content.Font,
            GalleryImageUrls = content.GalleryImages.Select(k => ImageUrl(cdnBaseUrl, k)).ToList(),
            WeeklyHours = content.WeeklyHours.Select(SiteDayHoursDto.From).ToList(),
            DirectionsNote = content.DirectionsNote,
            WhatsappPhone = content.WhatsappPhone,
            Amenities = [.. content.Amenities],
            HiddenFaqs = [.. content.HiddenFaqs],
            HomeSections = content.HomeSections.Select(h => new SiteHomeSectionDto { Key = h.Key, Enabled = h.Enabled }).ToList(),
            Rating = content.Rating,
            ReviewCount = content.ReviewCount,
            ReviewsUrl = content.ReviewsUrl,
            FeaturedReviews = content.FeaturedReviews.Select(r => new SiteReviewDto { Author = r.Author, Text = r.Text, Source = r.Source }).ToList(),
            FounderPhotoUrl = ImageUrl(cdnBaseUrl, content.FounderPhoto),
            FounderName = content.FounderName,
            FounderTitle = content.FounderTitle,
            FounderQuote = content.FounderQuote,
            FoundedYear = content.FoundedYear,
            Values = content.Values.Select(v => new SiteValueDto { Title = v.Title, Text = v.Text }).ToList(),
            Milestones = content.Milestones.Select(m => new SiteMilestoneDto { Year = m.Year, Text = m.Text }).ToList(),
            SeoTitle = content.SeoTitle,
            SeoDescription = content.SeoDescription,
            ShareImageUrl = ImageUrl(cdnBaseUrl, content.ShareImage),
            MenuHeroUrl = ImageUrl(cdnBaseUrl, content.MenuHero),
            AboutHeroUrl = ImageUrl(cdnBaseUrl, content.AboutHero),
            VenueHeroUrl = ImageUrl(cdnBaseUrl, content.VenueHero),
            ContactHeroUrl = ImageUrl(cdnBaseUrl, content.ContactHero),
            ReservationHeroUrl = ImageUrl(cdnBaseUrl, content.ReservationHero),
        };
    }
}

/// <summary>Sayfanın geçerli başlık, açıklama ve paylaşım görseli (girilmemişse otomatik değerler).</summary>
public class SiteSeoDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    /// <summary>Tam adres; hiç fotoğraf yoksa boş.</summary>
    public string ShareImageUrl { get; set; } = string.Empty;
}

/// <summary>Anasayfanın bir bölümü ("categories", "featured", "about", "features", "gallery", "reviews", "contact") ve görünürlüğü.</summary>
public class SiteHomeSectionDto
{
    public string Key { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
}

public class SiteDayHoursDto
{
    /// <summary>0 Pazar … 6 Cumartesi (JS Date.getDay ile aynı).</summary>
    public int Day { get; set; }
    public bool IsOpen { get; set; }
    /// <summary>"HH:mm"</summary>
    public string Opens { get; set; } = string.Empty;
    public string Closes { get; set; } = string.Empty;

    public static SiteDayHoursDto From(SiteDayHours hours) => new()
    {
        Day = (int)hours.Day,
        IsOpen = hours.IsOpen,
        Opens = hours.Opens.ToString("HH:mm", CultureInfo.InvariantCulture),
        Closes = hours.Closes.ToString("HH:mm", CultureInfo.InvariantCulture),
    };
}

public class SiteReviewDto
{
    public string Author { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    /// <summary>"Google", "Tripadvisor"...</summary>
    public string Source { get; set; } = string.Empty;
}

public class SiteValueDto
{
    public string Title { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}

public class SiteMilestoneDto
{
    public int Year { get; set; }
    public string Text { get; set; } = string.Empty;
}

public class SiteRegionDetailDto
{
    public Guid RegionId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int TableCount { get; set; }
    public string PhotoUrl { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

// ── "Sitenizi güzelleştirin" paneli ─────────────────────────────────────────────────────────────

/// <summary>Sitenin doluluğu: yüzde ve görsel etkisine göre sıralı yapılacaklar.</summary>
public class SiteCompletenessDto
{
    /// <summary>0–100.</summary>
    public int Score { get; set; }
    public int TotalProducts { get; set; }
    public int ProductsWithoutPhoto { get; set; }
    /// <summary>Görsel etkisine göre büyükten küçüğe; tamamlananlar da listede (Done = true).</summary>
    public List<SiteChecklistItemDto> Items { get; set; } = [];
}

public class SiteChecklistItemDto
{
    /// <summary>"cover", "gallery", "productPhotos", "story", "hours"...: ön yüz bununla alana atlar.</summary>
    public string Key { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    /// <summary>Tek satır neden: "Kapak fotoğrafı ana sayfanın ilk izlenimidir."</summary>
    public string Reason { get; set; } = string.Empty;
    public bool Done { get; set; }
    /// <summary>Puanın ağırlığı (görsel etki).</summary>
    public int Weight { get; set; }
    /// <summary>Kısmi ilerleme 0–1 (ör. ürün fotoğrafları); tamamsa 1.</summary>
    public double Progress { get; set; }
    /// <summary>Durum satırı: "3 / 12 fotoğraf", "8 ürün fotoğrafsız".</summary>
    public string Detail { get; set; } = string.Empty;
}
