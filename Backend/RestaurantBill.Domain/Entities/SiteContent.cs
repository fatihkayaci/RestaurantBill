using System.Globalization;
using System.Text.RegularExpressions;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    /// <summary>Sitedeki haftalık çalışma saatlerinin bir günü. Kapanış açılıştan önceyse gece yarısını aşar; eşitse 24 saat açık.</summary>
    public sealed record SiteDayHours(DayOfWeek Day, bool IsOpen, TimeOnly Opens, TimeOnly Closes);

    /// <summary>Restoranın seçip sitede gösterdiği gerçek bir misafir yorumu.</summary>
    public sealed record SiteReview(string Author, string Text, string Source);

    /// <summary>Hakkımızda'daki kısa değer kartı ("Her sabah zırh" / "Kıyma günlük, el ile çekilir.").</summary>
    public sealed record SiteValue(string Title, string Text);

    /// <summary>Hakkımızda'daki zaman çizelgesinin bir satırı.</summary>
    public sealed record SiteMilestone(int Year, string Text);

    /// <summary>Oturma bölümünün sitedeki fotoğrafı (depo anahtarı) ve kısa açıklaması.</summary>
    public sealed record SiteRegionDetail(Guid RegionId, string PhotoKey, string Description);

    /// <summary>Admin formunun metin kısmı: fotoğraflar (galeri, usta, bölüm) ayrı uçlardan değişir ve burada korunur.</summary>
    public sealed class SiteContentTexts
    {
        public string Theme { get; init; } = string.Empty;
        /// <summary>Boş: "her gün aynı" (tek aralık şubenin OpensAt/ClosesAt alanında). Doluysa 7 gün.</summary>
        public IReadOnlyList<SiteDayHours> WeeklyHours { get; init; } = [];
        public string DirectionsNote { get; init; } = string.Empty;
        public string WhatsappPhone { get; init; } = string.Empty;
        public IReadOnlyList<string> Amenities { get; init; } = [];
        public decimal? Rating { get; init; }
        public int? ReviewCount { get; init; }
        public string ReviewsUrl { get; init; } = string.Empty;
        public IReadOnlyList<SiteReview> FeaturedReviews { get; init; } = [];
        public string FounderName { get; init; } = string.Empty;
        public string FounderTitle { get; init; } = string.Empty;
        public string FounderQuote { get; init; } = string.Empty;
        public int? FoundedYear { get; init; }
        public IReadOnlyList<SiteValue> Values { get; init; } = [];
        public IReadOnlyList<SiteMilestone> Milestones { get; init; } = [];
        /// <summary>Bölüm kimliği → açıklama. Listede olmayan bölümün açıklaması silinir, fotoğrafı korunur.</summary>
        public IReadOnlyDictionary<Guid, string> RegionDescriptions { get; init; } = new Dictionary<Guid, string>();
        /// <summary>Google/paylaşım başlığı; boş = otomatik. null: değiştirme (eski form bu alanı göndermez).</summary>
        public string? SeoTitle { get; init; }
        /// <summary>Google/paylaşım açıklaması; boş = otomatik. null: değiştirme.</summary>
        public string? SeoDescription { get; init; }
        /// <summary>Sitede gizlenen hazır "Sık sorulanlar" anahtarları; null: değiştirme (eski form bu alanı göndermez).</summary>
        public IReadOnlyList<string>? HiddenFaqs { get; init; }
        /// <summary>Sitenin tasarımı ("renkli", "sade", "elit"); boş = varsayılan (renkli). null: değiştirme (eski form göndermez).</summary>
        public string? Design { get; init; }
        /// <summary>Yazı tipi çifti (<see cref="SiteContent.FontKeys"/>); boş = tasarımın kendi yazı tipi. null: değiştirme.</summary>
        public string? Font { get; init; }
    }

    /// <summary>
    /// Restoran sitesinin ek içeriği (değişmez değer nesnesi; şubede tek bir jsonb sütununda). Hiç kaydedilmemişse
    /// <see cref="Empty"/>: varsayılan tema (terracotta/krem) ve boş alanlar; boş alanın kartı sitede çizilmez.
    /// </summary>
    public sealed record SiteContent
    {
        public const int GalleryMax = 12;
        public const int DirectionsNoteMaxLength = 200;
        public const int WhatsappMaxLength = 20;
        public const int ReviewsUrlMaxLength = 300;
        public const int ReviewsMax = 3;
        public const int ReviewAuthorMaxLength = 40;
        public const int ReviewTextMaxLength = 280;
        public const int ReviewSourceMaxLength = 30;
        public const int FounderNameMaxLength = 60;
        public const int FounderTitleMaxLength = 60;
        public const int FounderQuoteMaxLength = 240;
        public const int ValuesMax = 3;
        public const int ValueTitleMaxLength = 40;
        public const int ValueTextMaxLength = 140;
        public const int MilestonesMax = 5;
        public const int MilestoneTextMaxLength = 140;
        public const int RegionDescriptionMaxLength = 160;
        public const int MinYear = 1800;
        public const decimal RatingMin = 1m;
        public const decimal RatingMax = 5m;
        public const int ReviewCountMax = 10_000_000;
        public const int SeoTitleMaxLength = 100;
        public const int SeoDescriptionMaxLength = 320;
        public const int HiddenFaqsMax = 30;
        public const int FaqKeyMaxLength = 40;

        /// <summary>Gizlenen soru anahtarı: küçük harf, rakam ve tire (en çok 40). Soruların listesi ön yüzdedir.</summary>
        public static readonly Regex FaqKeyPattern = new("^[a-z0-9-]{1,40}$", RegexOptions.Compiled);

        /// <summary>Sitenin hazır renk temaları; boş = varsayılan (terracotta). Ön yüzdeki SITE_THEMES ile aynı anahtarlar.</summary>
        public static readonly IReadOnlyList<string> ThemeKeys = ["terracotta", "zeytin", "lacivert", "bordo", "komur", "beyaz"];

        /// <summary>Sitenin tasarımları; boş = varsayılan ("renkli"). Ön yüzdeki SITE_DESIGNS ile aynı anahtarlar.
        /// Tasarım ve renk teması ayrıdır: her tasarım bütün temaları (ve özel vurgu rengini) kendi paletiyle çizer.</summary>
        public static readonly IReadOnlyList<string> DesignKeys = ["renkli", "sade", "elit"];

        /// <summary>Başlık + gövde yazı tipi çiftleri; boş = tasarımın kendi çifti. Ön yüzdeki SITE_FONTS ile aynı anahtarlar.</summary>
        public static readonly IReadOnlyList<string> FontKeys =
            ["fraunces-manrope", "instrument-manrope", "bodoni-montserrat", "playfair-inter", "dmserif-dmsans", "cormorant-lato", "grotesk-inter"];

        /// <summary>Mekânın olanakları: yalnız bu hazır listeden seçilir (uydurma beyan olmasın). Sırası sitedeki sıradır.</summary>
        public static readonly IReadOnlyList<string> AmenityKeys =
            ["avlu", "teras", "otopark", "vale", "cocuk", "wifi", "engelli", "evcil", "canli-muzik", "vejetaryen", "kartla-odeme",
             "bebek-sandalyesi", "aile-salonu", "sigara-alani", "ozel-gun"];

        public static SiteContent Empty { get; } = new();

        public string Theme { get; init; } = string.Empty;
        /// <summary>Sitenin tasarımı (<see cref="DesignKeys"/>); boş = varsayılan (renkli).</summary>
        public string Design { get; init; } = string.Empty;
        /// <summary>Yazı tipi çifti (<see cref="FontKeys"/>); boş = tasarımın kendi yazı tipi.</summary>
        public string Font { get; init; } = string.Empty;
        /// <summary>Mekân fotoğraflarının depo anahtarları, sitedeki sırayla.</summary>
        public IReadOnlyList<string> GalleryImages { get; init; } = [];
        /// <summary>Boş ya da Pazartesi → Pazar 7 gün.</summary>
        public IReadOnlyList<SiteDayHours> WeeklyHours { get; init; } = [];
        public string DirectionsNote { get; init; } = string.Empty;
        public string WhatsappPhone { get; init; } = string.Empty;
        public IReadOnlyList<string> Amenities { get; init; } = [];
        public decimal? Rating { get; init; }
        public int? ReviewCount { get; init; }
        public string ReviewsUrl { get; init; } = string.Empty;
        public IReadOnlyList<SiteReview> FeaturedReviews { get; init; } = [];
        public string FounderPhoto { get; init; } = string.Empty;
        public string FounderName { get; init; } = string.Empty;
        public string FounderTitle { get; init; } = string.Empty;
        public string FounderQuote { get; init; } = string.Empty;
        public int? FoundedYear { get; init; }
        public IReadOnlyList<SiteValue> Values { get; init; } = [];
        public IReadOnlyList<SiteMilestone> Milestones { get; init; } = [];
        public IReadOnlyList<SiteRegionDetail> RegionDetails { get; init; } = [];
        /// <summary>Google'da ve WhatsApp/Instagram önizlemesinde görünen başlık; boş = otomatik (restoran adı · ilçe).</summary>
        public string SeoTitle { get; init; } = string.Empty;
        /// <summary>Arama sonucu / paylaşım açıklaması; boş = otomatik (alt başlık · ilçe · saatler). Sunucuda kırpılmaz.</summary>
        public string SeoDescription { get; init; } = string.Empty;
        /// <summary>Paylaşım görselinin depo anahtarı; boş = kapak fotoğrafı.</summary>
        public string ShareImage { get; init; } = string.Empty;
        /// <summary>Sitede gösterilmeyen hazır "Sık sorulanlar" anahtarları (ön yüzün listesi; varsayılan: hepsi görünür).</summary>
        public IReadOnlyList<string> HiddenFaqs { get; init; } = [];

        // Alt sayfaların kendi kapak fotoğrafları; boş = sitenin kapağı (Mekân'da galeri → hikâye → kapak).
        public string MenuHero { get; init; } = string.Empty;
        public string AboutHero { get; init; } = string.Empty;
        public string VenueHero { get; init; } = string.Empty;
        public string ContactHero { get; init; } = string.Empty;
        public string ReservationHero { get; init; } = string.Empty;

        /// <summary>Alt sayfa kapağı alanı mı (Menü, Hakkımızda, Mekân, İletişim, Rezervasyon).</summary>
        public static bool IsHeroSlot(SiteImageSlot slot) => slot is SiteImageSlot.MenuHero or SiteImageSlot.AboutHero
            or SiteImageSlot.VenueHero or SiteImageSlot.ContactHero or SiteImageSlot.ReservationHero;

        /// <summary>Alt sayfa kapağının anahtarı; boş = girilmemiş.</summary>
        public string HeroImage(SiteImageSlot slot) => slot switch
        {
            SiteImageSlot.MenuHero => MenuHero,
            SiteImageSlot.AboutHero => AboutHero,
            SiteImageSlot.VenueHero => VenueHero,
            SiteImageSlot.ContactHero => ContactHero,
            SiteImageSlot.ReservationHero => ReservationHero,
            _ => throw new DomainException("Geçersiz görsel alanı."),
        };

        public SiteContent WithHeroImage(SiteImageSlot slot, string key, out string previousKey)
        {
            previousKey = HeroImage(slot);
            return slot switch
            {
                SiteImageSlot.MenuHero => this with { MenuHero = key },
                SiteImageSlot.AboutHero => this with { AboutHero = key },
                SiteImageSlot.VenueHero => this with { VenueHero = key },
                SiteImageSlot.ContactHero => this with { ContactHero = key },
                _ => this with { ReservationHero = key },
            };
        }

        // Pazartesi → Pazar (ekranda bu sırayla).
        public static readonly IReadOnlyList<DayOfWeek> WeekOrder = ReservationSettings.WeekOrder;

        /// <summary>Metinleri doğrulayıp yeni içerik döner; fotoğraf anahtarları (galeri, usta, bölüm) korunur.</summary>
        public SiteContent WithTexts(SiteContentTexts texts, int currentYear)
        {
            string theme = texts.Theme.Trim().ToLowerInvariant();
            if (theme.Length > 0 && !ThemeKeys.Contains(theme))
                throw new DomainException("Geçersiz site teması.");

            string design = texts.Design is null ? Design : texts.Design.Trim().ToLowerInvariant();
            if (design.Length > 0 && !DesignKeys.Contains(design))
                throw new DomainException("Geçersiz site tasarımı.");

            string font = texts.Font is null ? Font : texts.Font.Trim().ToLowerInvariant();
            if (font.Length > 0 && !FontKeys.Contains(font))
                throw new DomainException("Geçersiz yazı tipi.");

            string directions = Limit(texts.DirectionsNote, DirectionsNoteMaxLength, "Nasıl gelinir notu");
            string whatsapp = NormalizePhone(texts.WhatsappPhone);
            string reviewsUrl = Limit(texts.ReviewsUrl, ReviewsUrlMaxLength, "Yorum bağlantısı");
            if (reviewsUrl.Length > 0 && !reviewsUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                throw new DomainException("Yorum bağlantısı https:// ile başlamalıdır.");

            HashSet<string> picked = texts.Amenities.Select(a => a.Trim().ToLowerInvariant()).ToHashSet();
            string? unknown = picked.FirstOrDefault(a => !AmenityKeys.Contains(a));
            if (unknown is not null) throw new DomainException("Olanaklar yalnız hazır listeden seçilebilir.");
            List<string> amenities = AmenityKeys.Where(picked.Contains).ToList();

            decimal? rating = texts.Rating;
            if (rating is decimal r)
            {
                if (r < RatingMin || r > RatingMax) throw new DomainException("Puan 1 ile 5 arasında olmalıdır.");
                rating = Math.Round(r, 1, MidpointRounding.AwayFromZero);
            }
            if (texts.ReviewCount is int count && (count < 0 || count > ReviewCountMax))
                throw new DomainException("Yorum sayısı geçersiz.");

            List<SiteReview> reviews = texts.FeaturedReviews
                .Select(x => new SiteReview(
                    Limit(x.Author, ReviewAuthorMaxLength, "Yorum sahibinin adı"),
                    Limit(x.Text, ReviewTextMaxLength, "Yorum metni"),
                    Limit(x.Source, ReviewSourceMaxLength, "Yorum kaynağı")))
                .Where(x => x.Text.Length > 0 || x.Author.Length > 0)
                .ToList();
            if (reviews.Count > ReviewsMax) throw new DomainException($"En fazla {ReviewsMax} yorum seçilebilir.");
            if (reviews.Any(x => x.Text.Length == 0)) throw new DomainException("Yorum metnini girin.");
            if (reviews.Any(x => x.Author.Length == 0)) throw new DomainException("Yorumu yazanın adını girin.");

            int? founded = texts.FoundedYear;
            if (founded is int y && (y < MinYear || y > currentYear))
                throw new DomainException($"Kuruluş yılı {MinYear}–{currentYear} arasında olmalıdır.");

            List<SiteValue> values = texts.Values
                .Select(v => new SiteValue(Limit(v.Title, ValueTitleMaxLength, "Değer başlığı"), Limit(v.Text, ValueTextMaxLength, "Değer cümlesi")))
                .Where(v => v.Title.Length > 0 || v.Text.Length > 0)
                .ToList();
            if (values.Count > ValuesMax) throw new DomainException($"En fazla {ValuesMax} değer girilebilir.");
            if (values.Any(v => v.Title.Length == 0)) throw new DomainException("Her değerin bir başlığı olmalıdır.");

            List<SiteMilestone> milestones = texts.Milestones
                .Select(m => new SiteMilestone(m.Year, Limit(m.Text, MilestoneTextMaxLength, "Kilometre taşı")))
                .Where(m => m.Text.Length > 0 || m.Year != 0)
                .ToList();
            if (milestones.Count > MilestonesMax) throw new DomainException($"En fazla {MilestonesMax} kilometre taşı girilebilir.");
            if (milestones.Any(m => m.Year < MinYear || m.Year > currentYear))
                throw new DomainException($"Kilometre taşı yılı {MinYear}–{currentYear} arasında olmalıdır.");
            if (milestones.Any(m => m.Text.Length == 0)) throw new DomainException("Her kilometre taşına bir cümle yazın.");
            milestones = milestones.OrderBy(m => m.Year).ToList();

            IReadOnlyList<string> hiddenFaqs = texts.HiddenFaqs is null ? HiddenFaqs : NormalizeFaqKeys(texts.HiddenFaqs);

            List<SiteRegionDetail> regions = [];
            foreach ((Guid regionId, string rawDescription) in texts.RegionDescriptions)
            {
                string description = Limit(rawDescription, RegionDescriptionMaxLength, "Bölüm açıklaması");
                string photo = RegionDetails.FirstOrDefault(d => d.RegionId == regionId)?.PhotoKey ?? string.Empty;
                if (description.Length > 0 || photo.Length > 0) regions.Add(new SiteRegionDetail(regionId, photo, description));
            }
            // Açıklaması gönderilmeyen ama fotoğrafı olan bölüm fotoğrafıyla kalır.
            regions.AddRange(RegionDetails
                .Where(d => d.PhotoKey.Length > 0 && !texts.RegionDescriptions.ContainsKey(d.RegionId))
                .Select(d => d with { Description = string.Empty }));

            return this with
            {
                Theme = theme,
                Design = design,
                Font = font,
                WeeklyHours = NormalizeWeek(texts.WeeklyHours),
                DirectionsNote = directions,
                WhatsappPhone = whatsapp,
                Amenities = amenities,
                Rating = rating,
                ReviewCount = texts.ReviewCount,
                ReviewsUrl = reviewsUrl,
                FeaturedReviews = reviews,
                FounderName = Limit(texts.FounderName, FounderNameMaxLength, "Ustanın adı"),
                FounderTitle = Limit(texts.FounderTitle, FounderTitleMaxLength, "Ustanın unvanı"),
                FounderQuote = Limit(texts.FounderQuote, FounderQuoteMaxLength, "Ustanın sözü"),
                FoundedYear = founded,
                Values = values,
                Milestones = milestones,
                RegionDetails = regions,
                SeoTitle = texts.SeoTitle is null ? SeoTitle : Limit(texts.SeoTitle, SeoTitleMaxLength, "Sayfa başlığı"),
                SeoDescription = texts.SeoDescription is null ? SeoDescription : Limit(texts.SeoDescription, SeoDescriptionMaxLength, "Açıklama"),
                HiddenFaqs = hiddenFaqs,
            };
        }

        /// <summary>Gizlenen soru anahtarları: kırpılır, küçük harfe çevrilir, tekrarlar atılır (sıra korunur); en çok 30.</summary>
        private static List<string> NormalizeFaqKeys(IReadOnlyList<string> keys)
        {
            List<string> result = [];
            foreach (string raw in keys)
            {
                string key = (raw ?? string.Empty).Trim().ToLowerInvariant();
                if (!FaqKeyPattern.IsMatch(key)) throw new DomainException("Geçersiz soru anahtarı.");
                if (!result.Contains(key)) result.Add(key);
            }
            if (result.Count > HiddenFaqsMax) throw new DomainException($"En fazla {HiddenFaqsMax} soru gizlenebilir.");
            return result;
        }

        public SiteContent WithShareImage(string key, out string previousKey)
        {
            previousKey = ShareImage;
            return this with { ShareImage = key };
        }

        /// <summary>Galerideki bir fotoğrafı yenisiyle değiştirir (sıra korunur).</summary>
        public SiteContent WithGalleryImageAt(int index, string key, out string previousKey)
        {
            if (index < 0 || index >= GalleryImages.Count) throw new DomainException("Fotoğraf bulunamadı.");
            previousKey = GalleryImages[index];
            return this with { GalleryImages = GalleryImages.Select((k, i) => i == index ? key : k).ToList() };
        }

        public SiteContent WithGalleryImage(string key)
        {
            if (GalleryImages.Count >= GalleryMax)
                throw new DomainException($"En fazla {GalleryMax} mekân fotoğrafı yüklenebilir. Yenisini eklemek için birini kaldırın.");
            return this with { GalleryImages = [.. GalleryImages, key] };
        }

        public SiteContent WithoutGalleryImage(int index, out string removedKey)
        {
            if (index < 0 || index >= GalleryImages.Count) throw new DomainException("Fotoğraf bulunamadı.");
            removedKey = GalleryImages[index];
            return this with { GalleryImages = GalleryImages.Where((_, i) => i != index).ToList() };
        }

        /// <summary><paramref name="order"/>: mevcut sıraların yeni dizilişi (ör. [2, 0, 1]); tam bir permütasyon olmalı.</summary>
        public SiteContent WithGalleryOrder(IReadOnlyList<int> order)
        {
            if (order.Count != GalleryImages.Count || order.Distinct().Count() != order.Count || order.Any(i => i < 0 || i >= GalleryImages.Count))
                throw new DomainException("Fotoğraf sırası geçersiz. Sayfayı yenileyip tekrar deneyin.");
            return this with { GalleryImages = order.Select(i => GalleryImages[i]).ToList() };
        }

        public SiteContent WithFounderPhoto(string key, out string previousKey)
        {
            previousKey = FounderPhoto;
            return this with { FounderPhoto = key };
        }

        public SiteContent WithRegionPhoto(Guid regionId, string key, out string previousKey)
        {
            SiteRegionDetail? current = RegionDetails.FirstOrDefault(d => d.RegionId == regionId);
            previousKey = current?.PhotoKey ?? string.Empty;
            List<SiteRegionDetail> rest = RegionDetails.Where(d => d.RegionId != regionId).ToList();
            SiteRegionDetail next = new(regionId, key, current?.Description ?? string.Empty);
            if (next.PhotoKey.Length > 0 || next.Description.Length > 0) rest.Add(next);
            return this with { RegionDetails = rest };
        }

        /// <summary>Haftalık saatlere göre verilen yerel anda açık mı; haftalık saat girilmemişse null.</summary>
        public bool? IsOpenAt(DateTime local)
        {
            if (WeeklyHours.Count == 0) return null;
            TimeOnly now = TimeOnly.FromDateTime(local);
            SiteDayHours? today = WeeklyHours.FirstOrDefault(d => d.Day == local.DayOfWeek);
            SiteDayHours? yesterday = WeeklyHours.FirstOrDefault(d => d.Day == local.AddDays(-1).DayOfWeek);

            if (today is { IsOpen: true })
            {
                if (today.Opens == today.Closes) return true;
                if (today.Opens < today.Closes ? now >= today.Opens && now < today.Closes : now >= today.Opens) return true;
            }
            // Dünün gece yarısını aşan aralığı (ör. Cuma 18:00–02:00) bugünün ilk saatlerini kapsar.
            return yesterday is { IsOpen: true } && yesterday.Opens > yesterday.Closes && now < yesterday.Closes;
        }

        /// <summary>Açık günlerde en sık görülen aralık: eski tek aralık alanı (rezervasyon/online sipariş varsayılanları) için.</summary>
        public (TimeOnly Opens, TimeOnly Closes)? MostCommonRange()
        {
            var open = WeeklyHours.Where(d => d.IsOpen).ToList();
            if (open.Count == 0) return null;
            var top = open.GroupBy(d => (d.Opens, d.Closes)).OrderByDescending(g => g.Count()).First().Key;
            return top;
        }

        private static IReadOnlyList<SiteDayHours> NormalizeWeek(IReadOnlyList<SiteDayHours> days)
        {
            if (days.Count == 0) return [];
            if (days.Count != 7 || days.Select(d => d.Day).Distinct().Count() != 7)
                throw new DomainException("Haftalık saatlerde her gün bir kez yer almalıdır.");
            if (!days.Any(d => d.IsOpen))
                throw new DomainException("Haftada en az bir gün açık olmalıdır.");
            return WeekOrder.Select(day => days.First(d => d.Day == day)).ToList();
        }

        private static string NormalizePhone(string value)
        {
            string trimmed = value.Trim();
            if (trimmed.Length == 0) return string.Empty;
            if (trimmed.Length > WhatsappMaxLength || !Regex.IsMatch(trimmed, @"^\+?[\d\s().-]+$"))
                throw new DomainException("WhatsApp numarası yalnız rakam içermelidir (ör. 0532 000 48 48).");
            int digits = trimmed.Count(char.IsDigit);
            if (digits < 10 || digits > 15)
                throw new DomainException("WhatsApp numarası 10–15 haneli olmalıdır.");
            return trimmed;
        }

        private static string Limit(string? value, int max, string label)
        {
            string trimmed = value?.Trim() ?? string.Empty;
            if (trimmed.Length > max)
                throw new DomainException(string.Create(CultureInfo.InvariantCulture, $"{label} en fazla {max} karakter olabilir."));
            return trimmed;
        }
    }
}
