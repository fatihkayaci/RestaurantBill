using System.Text.RegularExpressions;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    /// <summary>Admin'in site düzenleyicisinden kaydettiği metin kısmı: şubenin site sütunları + ek içerik (SEO dahil).</summary>
    public sealed class SiteTexts
    {
        public string Headline { get; init; } = string.Empty;
        public string Tagline { get; init; } = string.Empty;
        public string StoryTitle { get; init; } = string.Empty;
        public string About { get; init; } = string.Empty;
        public TimeOnly? OpensAt { get; init; }
        public TimeOnly? ClosesAt { get; init; }
        public string HoursNote { get; init; } = string.Empty;
        public string InstagramUrl { get; init; } = string.Empty;
        public string AccentColor { get; init; } = string.Empty;
        public SiteContentTexts Content { get; init; } = new();
    }

    /// <summary>
    /// Restoran sitesinin taslağa alınabilen bütün hâli (değişmez değer nesnesi): metinler, saatler, fotoğraf anahtarları
    /// ve SEO. Yayındaki hâl şubenin sütunlarından (<see cref="Branch.GetPublishedSite"/>), taslak tek bir jsonb sütunundan
    /// (<see cref="Branch.SiteDraft"/>) okunur. Restoran adı, adres ve telefon taslağa girmez (Ayarlar'da kalır).
    /// </summary>
    public sealed record SiteSnapshot
    {
        public string Headline { get; init; } = string.Empty;
        public string Tagline { get; init; } = string.Empty;
        public string StoryTitle { get; init; } = string.Empty;
        public string About { get; init; } = string.Empty;
        public string CoverImage { get; init; } = string.Empty;
        public string AboutImage { get; init; } = string.Empty;
        public TimeOnly? OpensAt { get; init; }
        public TimeOnly? ClosesAt { get; init; }
        public string HoursNote { get; init; } = string.Empty;
        public string InstagramUrl { get; init; } = string.Empty;
        public string AccentColor { get; init; } = string.Empty;
        public SiteContent Content { get; init; } = SiteContent.Empty;

        // ── Alan anahtarları: "yayınlanmamış değişiklikler" listesi ve alan bazında geri alma ────────────────
        public const string RegionFieldPrefix = "region:";

        /// <summary>Bölüm dışındaki alanların anahtarları, ekrandaki sırayla. Bölümler "region:{id}" olarak eklenir.</summary>
        public static readonly IReadOnlyList<string> FieldKeys =
        [
            "headline", "tagline", "coverImage", "storyTitle", "about", "aboutImage",
            "hours", "hoursNote", "instagramUrl", "directionsNote", "whatsappPhone",
            "design", "font", "theme", "accentColor",
            "gallery", "amenities", "hiddenFaqs",
            "rating", "reviewCount", "reviewsUrl", "featuredReviews",
            "founderPhoto", "founderName", "founderTitle", "founderQuote", "foundedYear", "values", "milestones",
            "seoTitle", "seoDescription", "shareImage",
            "heroMenu", "heroAbout", "heroVenue", "heroContact", "heroReservation",
        ];

        /// <summary>Alt sayfa kapağı alanlarının anahtarları ve görsel alanları.</summary>
        public static readonly IReadOnlyDictionary<string, SiteImageSlot> HeroFields = new Dictionary<string, SiteImageSlot>
        {
            ["heroMenu"] = SiteImageSlot.MenuHero,
            ["heroAbout"] = SiteImageSlot.AboutHero,
            ["heroVenue"] = SiteImageSlot.VenueHero,
            ["heroContact"] = SiteImageSlot.ContactHero,
            ["heroReservation"] = SiteImageSlot.ReservationHero,
        };

        /// <summary>Metinleri doğrular ve yeni hâli döner; fotoğraf anahtarları korunur.</summary>
        public SiteSnapshot WithTexts(SiteTexts texts, int currentYear)
        {
            SiteSnapshot basics = WithBasics(texts.Headline, texts.Tagline, texts.StoryTitle, texts.About, texts.OpensAt, texts.ClosesAt,
                texts.HoursNote, texts.InstagramUrl, texts.AccentColor);
            SiteContent content = Content.WithTexts(texts.Content, currentYear);
            // Haftalık saat girildiyse eski tek aralık (rezervasyon/online sipariş varsayılanları) en sık aralığı alır.
            if (content.MostCommonRange() is { } range)
                basics = basics with { OpensAt = range.Opens, ClosesAt = range.Closes };
            return basics with { Content = content };
        }

        /// <summary>Şubenin site sütunlarının kuralları (eski form da bunu kullanır).</summary>
        public SiteSnapshot WithBasics(string headline, string tagline, string storyTitle, string about, TimeOnly? opensAt, TimeOnly? closesAt,
            string hoursNote, string instagramUrl, string accentColor)
        {
            if ((opensAt is null) != (closesAt is null))
                throw new DomainException("Açılış ve kapanış saatini birlikte girin ya da ikisini de boş bırakın.");

            string accent = (accentColor ?? string.Empty).Trim();
            if (accent.Length > 0 && !Regex.IsMatch(accent, "^#[0-9A-Fa-f]{6}$"))
                throw new DomainException("Vurgu rengi #RRGGBB biçiminde olmalıdır.");

            string instagram = (instagramUrl ?? string.Empty).Trim();
            if (instagram.Length > 0 && !instagram.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                throw new DomainException("Instagram adresi https:// ile başlamalıdır.");

            return this with
            {
                Headline = (headline ?? string.Empty).Trim(),
                Tagline = (tagline ?? string.Empty).Trim(),
                StoryTitle = (storyTitle ?? string.Empty).Trim(),
                About = (about ?? string.Empty).Trim(),
                OpensAt = opensAt,
                ClosesAt = closesAt,
                HoursNote = (hoursNote ?? string.Empty).Trim(),
                InstagramUrl = instagram,
                AccentColor = accent.ToUpperInvariant(),
            };
        }

        /// <summary>Tek fotoğraflık alana anahtar yazar; boş anahtar fotoğrafı kaldırır.</summary>
        public SiteSnapshot WithImage(SiteImageSlot slot, string key) => slot switch
        {
            SiteImageSlot.Cover => this with { CoverImage = key },
            SiteImageSlot.About => this with { AboutImage = key },
            SiteImageSlot.Founder => this with { Content = Content.WithFounderPhoto(key, out _) },
            SiteImageSlot.Share => this with { Content = Content.WithShareImage(key, out _) },
            _ when SiteContent.IsHeroSlot(slot) => this with { Content = Content.WithHeroImage(slot, key, out _) },
            _ => throw new DomainException("Geçersiz görsel alanı."),
        };

        /// <summary><paramref name="replaceIndex"/> verilirse o sıradaki fotoğrafı değiştirir, yoksa sona ekler.</summary>
        public SiteSnapshot WithGalleryImage(string key, int? replaceIndex) => replaceIndex is int index
            ? this with { Content = Content.WithGalleryImageAt(index, key, out _) }
            : this with { Content = Content.WithGalleryImage(key) };

        public SiteSnapshot WithoutGalleryImage(int index) => this with { Content = Content.WithoutGalleryImage(index, out _) };

        public SiteSnapshot WithGalleryOrder(IReadOnlyList<int> order) => this with { Content = Content.WithGalleryOrder(order) };

        public SiteSnapshot WithRegionPhoto(Guid regionId, string key) => this with { Content = Content.WithRegionPhoto(regionId, key, out _) };

        /// <summary>Bu hâlin kullandığı bütün depo anahtarları (paylaşılan hazır görseller dahil).</summary>
        public IReadOnlySet<string> ImageKeys()
        {
            HashSet<string> keys = [CoverImage, AboutImage, Content.FounderPhoto, Content.ShareImage, .. Content.GalleryImages,
                .. Content.RegionDetails.Select(r => r.PhotoKey),
                Content.MenuHero, Content.AboutHero, Content.VenueHero, Content.ContactHero, Content.ReservationHero];
            keys.RemoveWhere(string.IsNullOrWhiteSpace);
            return keys;
        }

        /// <summary><paramref name="published"/>'a göre değişen alanların anahtarları (<see cref="FieldKeys"/> sırasıyla, sonra bölümler).</summary>
        public IReadOnlyList<string> ChangedFields(SiteSnapshot published)
        {
            List<string> changed = FieldKeys.Where(field => !SameField(this, published, field)).ToList();
            IEnumerable<Guid> regionIds = Content.RegionDetails.Select(r => r.RegionId)
                .Union(published.Content.RegionDetails.Select(r => r.RegionId));
            foreach (Guid id in regionIds)
            {
                if (!Equals(Region(this, id), Region(published, id))) changed.Add(RegionFieldPrefix + id);
            }
            return changed;
        }

        /// <summary>Alanı <paramref name="source"/>'taki değerine döndürür (alan bazında "Geri al"). Bilinmeyen anahtar hata verir.</summary>
        public SiteSnapshot WithFieldFrom(SiteSnapshot source, string field)
        {
            SiteContent c = Content, s = source.Content;
            if (field.StartsWith(RegionFieldPrefix, StringComparison.Ordinal))
            {
                if (!Guid.TryParse(field[RegionFieldPrefix.Length..], out Guid id)) throw new DomainException("Geçersiz alan.");
                List<SiteRegionDetail> rest = c.RegionDetails.Where(r => r.RegionId != id).ToList();
                if (Region(source, id) is { } original) rest.Add(original);
                return this with { Content = c with { RegionDetails = rest } };
            }
            if (HeroFields.TryGetValue(field, out SiteImageSlot heroSlot))
                return this with { Content = c.WithHeroImage(heroSlot, s.HeroImage(heroSlot), out _) };

            return field switch
            {
                "headline" => this with { Headline = source.Headline },
                "tagline" => this with { Tagline = source.Tagline },
                "coverImage" => this with { CoverImage = source.CoverImage },
                "storyTitle" => this with { StoryTitle = source.StoryTitle },
                "about" => this with { About = source.About },
                "aboutImage" => this with { AboutImage = source.AboutImage },
                "hours" => this with { OpensAt = source.OpensAt, ClosesAt = source.ClosesAt, Content = c with { WeeklyHours = s.WeeklyHours } },
                "hoursNote" => this with { HoursNote = source.HoursNote },
                "instagramUrl" => this with { InstagramUrl = source.InstagramUrl },
                "directionsNote" => this with { Content = c with { DirectionsNote = s.DirectionsNote } },
                "whatsappPhone" => this with { Content = c with { WhatsappPhone = s.WhatsappPhone } },
                "design" => this with { Content = c with { Design = s.Design } },
                "font" => this with { Content = c with { Font = s.Font } },
                "theme" => this with { Content = c with { Theme = s.Theme } },
                "accentColor" => this with { AccentColor = source.AccentColor },
                "gallery" => this with { Content = c with { GalleryImages = s.GalleryImages } },
                "amenities" => this with { Content = c with { Amenities = s.Amenities } },
                "hiddenFaqs" => this with { Content = c with { HiddenFaqs = s.HiddenFaqs } },
                "rating" => this with { Content = c with { Rating = s.Rating } },
                "reviewCount" => this with { Content = c with { ReviewCount = s.ReviewCount } },
                "reviewsUrl" => this with { Content = c with { ReviewsUrl = s.ReviewsUrl } },
                "featuredReviews" => this with { Content = c with { FeaturedReviews = s.FeaturedReviews } },
                "founderPhoto" => this with { Content = c with { FounderPhoto = s.FounderPhoto } },
                "founderName" => this with { Content = c with { FounderName = s.FounderName } },
                "founderTitle" => this with { Content = c with { FounderTitle = s.FounderTitle } },
                "founderQuote" => this with { Content = c with { FounderQuote = s.FounderQuote } },
                "foundedYear" => this with { Content = c with { FoundedYear = s.FoundedYear } },
                "values" => this with { Content = c with { Values = s.Values } },
                "milestones" => this with { Content = c with { Milestones = s.Milestones } },
                "seoTitle" => this with { Content = c with { SeoTitle = s.SeoTitle } },
                "seoDescription" => this with { Content = c with { SeoDescription = s.SeoDescription } },
                "shareImage" => this with { Content = c with { ShareImage = s.ShareImage } },
                _ => throw new DomainException("Geçersiz alan."),
            };
        }

        private static SiteRegionDetail? Region(SiteSnapshot snapshot, Guid id) => snapshot.Content.RegionDetails.FirstOrDefault(r => r.RegionId == id);

        private static bool SameField(SiteSnapshot a, SiteSnapshot b, string field)
        {
            SiteContent x = a.Content, y = b.Content;
            if (HeroFields.TryGetValue(field, out SiteImageSlot heroSlot)) return x.HeroImage(heroSlot) == y.HeroImage(heroSlot);
            return field switch
            {
                "headline" => a.Headline == b.Headline,
                "tagline" => a.Tagline == b.Tagline,
                "coverImage" => a.CoverImage == b.CoverImage,
                "storyTitle" => a.StoryTitle == b.StoryTitle,
                "about" => a.About == b.About,
                "aboutImage" => a.AboutImage == b.AboutImage,
                "hours" => a.OpensAt == b.OpensAt && a.ClosesAt == b.ClosesAt && x.WeeklyHours.SequenceEqual(y.WeeklyHours),
                "hoursNote" => a.HoursNote == b.HoursNote,
                "instagramUrl" => a.InstagramUrl == b.InstagramUrl,
                "directionsNote" => x.DirectionsNote == y.DirectionsNote,
                "whatsappPhone" => x.WhatsappPhone == y.WhatsappPhone,
                "design" => x.Design == y.Design,
                "font" => x.Font == y.Font,
                "theme" => x.Theme == y.Theme,
                "accentColor" => a.AccentColor == b.AccentColor,
                "gallery" => x.GalleryImages.SequenceEqual(y.GalleryImages),
                "amenities" => x.Amenities.SequenceEqual(y.Amenities),
                "hiddenFaqs" => x.HiddenFaqs.SequenceEqual(y.HiddenFaqs),
                "rating" => x.Rating == y.Rating,
                "reviewCount" => x.ReviewCount == y.ReviewCount,
                "reviewsUrl" => x.ReviewsUrl == y.ReviewsUrl,
                "featuredReviews" => x.FeaturedReviews.SequenceEqual(y.FeaturedReviews),
                "founderPhoto" => x.FounderPhoto == y.FounderPhoto,
                "founderName" => x.FounderName == y.FounderName,
                "founderTitle" => x.FounderTitle == y.FounderTitle,
                "founderQuote" => x.FounderQuote == y.FounderQuote,
                "foundedYear" => x.FoundedYear == y.FoundedYear,
                "values" => x.Values.SequenceEqual(y.Values),
                "milestones" => x.Milestones.SequenceEqual(y.Milestones),
                "seoTitle" => x.SeoTitle == y.SeoTitle,
                "seoDescription" => x.SeoDescription == y.SeoDescription,
                "shareImage" => x.ShareImage == y.ShareImage,
                _ => true,
            };
        }
    }
}
