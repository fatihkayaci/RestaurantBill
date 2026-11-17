using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Domain.Entities
{
    public class Branch : BaseEntity
    {
        public Guid CompanyId { get; private set; }
        public Company Company { get; private set; } = default!;
        
        public string BranchName { get; private set; } = string.Empty;
        public string ManagerName { get; private set; } = string.Empty;
        public string Number { get; private set; } = string.Empty;
        public string Email { get; private set; } = string.Empty;
        public string City { get; private set; } = string.Empty;
        public string District { get; private set; } = string.Empty;
        public string OpenAddress { get; private set; } = string.Empty;
        public decimal TaxRate { get; private set; }

        public TimeOnly DayEndTime { get; private set; } = new(0, 0);
        public string TimeZoneId { get; private set; } = "Europe/Istanbul";

        // Restoranın müşteri sitesi. Boş alanın bölümü sitede hiç görünmez.
        public string SiteHeadline { get; private set; } = string.Empty;
        public string SiteTagline { get; private set; } = string.Empty;
        /// <summary>"Hikâyemiz" bölümünün büyük başlığı; ürün fotoğrafları kelimeler arasına hap olarak girer.</summary>
        public string SiteStoryTitle { get; private set; } = string.Empty;
        public string SiteAbout { get; private set; } = string.Empty;
        /// <summary>Görsel deposundaki anahtar; adres CDN ile birleştirilerek verilir.</summary>
        public string SiteCoverImage { get; private set; } = string.Empty;
        public string SiteAboutImage { get; private set; } = string.Empty;
        public TimeOnly? OpensAt { get; private set; }
        public TimeOnly? ClosesAt { get; private set; }
        public string HoursNote { get; private set; } = string.Empty;
        public string InstagramUrl { get; private set; } = string.Empty;
        /// <summary>"#RRGGBB"; boşsa sitenin varsayılan vurgu rengi.</summary>
        public string SiteAccentColor { get; private set; } = string.Empty;

        // Kasada "IBAN ile ödeme" için: boşluksuz, büyük harf "TR..." (26 karakter) ve hesap sahibinin adı.
        // İkisi de boşsa IBAN ile ödeme kapalıdır.
        public string Iban { get; private set; } = string.Empty;
        public string IbanHolderName { get; private set; } = string.Empty;

        public const int IbanHolderNameMaxLength = 70;

        /// <summary>Admin'in kaydettiği rezervasyon kuralları; null ise hiç ayarlanmamış (varsayılanlar geçerli).</summary>
        public ReservationSettings? ReservationSettings { get; private set; }

        /// <summary>Geçerli rezervasyon kuralları: kaydedilmiş ayar ya da açılış/kapanış saatinden türetilen varsayılan.</summary>
        public ReservationSettings GetReservationSettings()
            => ReservationSettings ?? Entities.ReservationSettings.Default(OpensAt, ClosesAt);

        /// <summary>null: varsayılanlara döner.</summary>
        public void SetReservationSettings(ReservationSettings? settings) => ReservationSettings = settings;

        /// <summary>Admin'in kaydettiği online sipariş kuralları; null ise hiç ayarlanmamış (varsayılan: kapalı).</summary>
        public OnlineOrderSettings? OnlineOrderSettings { get; private set; }

        /// <summary>Kasanın "Online siparişi durdur" anahtarı; ayarlardan ayrıdır, ayarlar açıkken de sipariş almayı keser.</summary>
        public bool OnlineOrdersPaused { get; private set; }

        public OnlineOrderSettings GetOnlineOrderSettings()
            => OnlineOrderSettings ?? Entities.OnlineOrderSettings.Default(OpensAt, ClosesAt);

        /// <summary>null: varsayılanlara döner.</summary>
        public void SetOnlineOrderSettings(OnlineOrderSettings? settings) => OnlineOrderSettings = settings;

        public void SetOnlineOrdersPaused(bool paused) => OnlineOrdersPaused = paused;

        /// <summary>Şu an online sipariş alınıyor mu (saat kontrolü hariç): ayarda açık ve durdurulmamış.</summary>
        public bool AcceptsOnlineOrders => GetOnlineOrderSettings().Enabled && !OnlineOrdersPaused;

        /// <summary>Admin'in kaydettiği masa QR özellikleri; null ise hiç ayarlanmamış (varsayılan: hepsi açık).</summary>
        public QrFeatures? QrFeatures { get; private set; }

        public QrFeatures GetQrFeatures() => QrFeatures ?? Entities.QrFeatures.Default;

        /// <summary>null: varsayılanlara döner.</summary>
        public void SetQrFeatures(QrFeatures? features) => QrFeatures = features;

        public bool HasIban => Iban.Length > 0;

        /// <summary>İkisi de boş: IBAN'ı kaldırır. Aksi halde geçerli bir TR IBAN ve hesap sahibi adı zorunludur.</summary>
        public void SetIban(string? iban, string? holderName)
        {
            string normalized = TurkishIban.Normalize(iban);
            string holder = holderName?.Trim() ?? string.Empty;

            if (normalized.Length == 0 && holder.Length == 0)
            {
                Iban = string.Empty;
                IbanHolderName = string.Empty;
                return;
            }

            if (!TurkishIban.IsValid(normalized))
                throw new DomainException("Geçerli bir IBAN girin: TR ile başlayan 26 karakter.");
            if (holder.Length == 0)
                throw new DomainException("Hesap sahibinin adını girin.");
            if (holder.Length > IbanHolderNameMaxLength)
                throw new DomainException($"Hesap sahibi adı en fazla {IbanHolderNameMaxLength} karakter olabilir.");

            Iban = normalized;
            IbanHolderName = holder;
        }

        public const int SiteHeadlineMaxLength = 80;
        public const int SiteTaglineMaxLength = 160;
        public const int SiteStoryTitleMaxLength = 120;
        public const int SiteAboutMaxLength = 800;
        public const int HoursNoteMaxLength = 80;
        public const int InstagramUrlMaxLength = 200;

        /// <summary>Eski form: yayındaki site metinlerini doğrudan değiştirir (kurallar <see cref="SiteSnapshot.WithBasics"/>).</summary>
        public void UpdateSite(string headline, string tagline, string storyTitle, string about, TimeOnly? opensAt, TimeOnly? closesAt,
            string hoursNote, string instagramUrl, string accentColor)
        {
            SiteSnapshot next = GetPublishedSite().WithBasics(headline, tagline, storyTitle, about, opensAt, closesAt, hoursNote, instagramUrl, accentColor);
            SiteHeadline = next.Headline;
            SiteTagline = next.Tagline;
            SiteStoryTitle = next.StoryTitle;
            SiteAbout = next.About;
            OpensAt = next.OpensAt;
            ClosesAt = next.ClosesAt;
            HoursNote = next.HoursNote;
            InstagramUrl = next.InstagramUrl;
            SiteAccentColor = next.AccentColor;
        }

        /// <summary>Yeni anahtarı yazar, eskisini döner (silmek çağıranın işi). Boş anahtar görseli kaldırır.</summary>
        public string ReplaceSiteImage(SiteImageSlot slot, string key)
        {
            string previous;
            if (slot == SiteImageSlot.Cover)
            {
                previous = SiteCoverImage;
                SiteCoverImage = key;
            }
            else if (slot == SiteImageSlot.Founder)
            {
                SiteContent = GetSiteContent().WithFounderPhoto(key, out previous);
            }
            else if (slot == SiteImageSlot.Share)
            {
                SiteContent = GetSiteContent().WithShareImage(key, out previous);
            }
            else if (Entities.SiteContent.IsHeroSlot(slot))
            {
                SiteContent = GetSiteContent().WithHeroImage(slot, key, out previous);
            }
            else
            {
                previous = SiteAboutImage;
                SiteAboutImage = key;
            }
            return previous;
        }

        /// <summary>Sitenin ek içeriği (tema, mekân fotoğrafları, haftalık saatler, usta, yorumlar...); null ise hiç kaydedilmemiş.</summary>
        public SiteContent? SiteContent { get; private set; }

        public SiteContent GetSiteContent() => SiteContent ?? Entities.SiteContent.Empty;

        /// <summary>
        /// Metin alanlarını kaydeder (fotoğraflar korunur). Haftalık saat girildiyse eski tek aralık (OpensAt/ClosesAt) en sık
        /// görülen aralıkla güncellenir: rezervasyon ve online sipariş varsayılanları onu kullanmaya devam eder.
        /// </summary>
        public void UpdateSiteContent(SiteContentTexts texts, int currentYear)
        {
            SiteContent next = GetSiteContent().WithTexts(texts, currentYear);
            if (next.MostCommonRange() is { } range)
            {
                OpensAt = range.Opens;
                ClosesAt = range.Closes;
            }
            SiteContent = next;
        }

        public void AddSiteGalleryImage(string key) => SiteContent = GetSiteContent().WithGalleryImage(key);

        /// <summary>Galeriden çıkarır; silinecek anahtarı döner.</summary>
        public string RemoveSiteGalleryImage(int index)
        {
            SiteContent = GetSiteContent().WithoutGalleryImage(index, out string removed);
            return removed;
        }

        public void ReorderSiteGallery(IReadOnlyList<int> order) => SiteContent = GetSiteContent().WithGalleryOrder(order);

        /// <summary>Bölüm fotoğrafını yazar (boş anahtar kaldırır), eskisini döner.</summary>
        public string ReplaceSiteRegionPhoto(Guid regionId, string key)
        {
            SiteContent = GetSiteContent().WithRegionPhoto(regionId, key, out string previous);
            return previous;
        }

        // ── Site taslağı ("Taslak + Yayınla") ──────────────────────────────────────────────────────────
        // Müşteri sitesi yayındaki sütunları okur; düzenleyici yalnızca taslağı değiştirir. Yayınla taslağı sütunlara kopyalar.

        /// <summary>Yayınlanmamış site taslağı (jsonb); null ise taslak yok, düzenleyici yayındaki hâli gösterir.</summary>
        public SiteSnapshot? SiteDraft { get; private set; }
        /// <summary>Taslağın sürümü: her taslak yazımında, yayında ve atmada artar. Eski sürümle kaydetmek "başkası düzenledi" çatışmasıdır.</summary>
        public int SiteDraftVersion { get; private set; }
        public DateTime? SiteDraftUpdatedAt { get; private set; }
        public DateTime? SitePublishedAt { get; private set; }

        /// <summary>Müşterinin şu an gördüğü site (şubenin sütunları).</summary>
        public SiteSnapshot GetPublishedSite() => new()
        {
            Headline = SiteHeadline,
            Tagline = SiteTagline,
            StoryTitle = SiteStoryTitle,
            About = SiteAbout,
            CoverImage = SiteCoverImage,
            AboutImage = SiteAboutImage,
            OpensAt = OpensAt,
            ClosesAt = ClosesAt,
            HoursNote = HoursNote,
            InstagramUrl = InstagramUrl,
            AccentColor = SiteAccentColor,
            Content = GetSiteContent(),
        };

        /// <summary>Düzenleyicide görünen hâl: taslak varsa o, yoksa yayındaki.</summary>
        public SiteSnapshot GetSiteDraft() => SiteDraft ?? GetPublishedSite();

        public bool IsSiteDraftStale(int version) => version != SiteDraftVersion;

        public void SaveSiteDraft(SiteSnapshot draft, DateTime nowUtc)
        {
            SiteDraft = draft;
            SiteDraftVersion++;
            SiteDraftUpdatedAt = nowUtc;
        }

        /// <summary>Taslağı yayına alır (yoksa bir şey değişmez) ve taslağı kapatır.</summary>
        public void PublishSiteDraft(DateTime nowUtc)
        {
            if (SiteDraft is { } draft)
            {
                SiteHeadline = draft.Headline;
                SiteTagline = draft.Tagline;
                SiteStoryTitle = draft.StoryTitle;
                SiteAbout = draft.About;
                SiteCoverImage = draft.CoverImage;
                SiteAboutImage = draft.AboutImage;
                OpensAt = draft.OpensAt;
                ClosesAt = draft.ClosesAt;
                HoursNote = draft.HoursNote;
                InstagramUrl = draft.InstagramUrl;
                SiteAccentColor = draft.AccentColor;
                SiteContent = draft.Content;
            }
            SiteDraft = null;
            SiteDraftVersion++;
            SiteDraftUpdatedAt = null;
            SitePublishedAt = nowUtc;
        }

        /// <summary>Taslağı siler; site son yayınlanan hâline döner.</summary>
        public void DiscardSiteDraft()
        {
            SiteDraft = null;
            SiteDraftVersion++;
            SiteDraftUpdatedAt = null;
        }

        /// <summary>Yayında ya da taslakta kullanılan bütün site fotoğrafı anahtarları: bunlardan biri silinmez.</summary>
        public IReadOnlySet<string> SiteImageKeysInUse()
        {
            HashSet<string> keys = [.. GetPublishedSite().ImageKeys()];
            if (SiteDraft is { } draft) keys.UnionWith(draft.ImageKeys());
            return keys;
        }

        /// <summary>
        /// Şubenin yerel saatiyle şu an açık mı. Haftalık saat varsa ona, yoksa tek aralığa bakılır; hiçbiri yoksa null.
        /// Kapanış açılıştan önceyse (ör. 18:00–02:00) gece yarısını aşan aralık sayılır.
        /// </summary>
        public bool? IsOpenAt(DateTime local)
        {
            bool? weekly = GetSiteContent().IsOpenAt(local);
            if (weekly is not null) return weekly;
            if (OpensAt is not TimeOnly opens || ClosesAt is not TimeOnly closes) return null;
            TimeOnly now = TimeOnly.FromDateTime(local);
            if (opens == closes) return true;
            return opens < closes ? now >= opens && now < closes : now >= opens || now < closes;
        }

        protected Branch() { }

        public static Branch Create(string name)
        {
            return new Branch { BranchName = name };
        }

        public static Branch Create(Guid companyId, string branchName, string managerName, string number, string email, string city, string district, string openAddress, decimal taxRate)
        {
            return new Branch
            {
                CompanyId = companyId,
                BranchName = branchName,
                ManagerName = managerName,
                Number = number,
                Email = email,
                City = city,
                District = district,
                OpenAddress = openAddress,
                TaxRate = taxRate
            };
        }

        public void Update(string branchName, string managerName, string number, string email, string city, string district, string openAddress, decimal taxRate)
        {
            BranchName = branchName;
            ManagerName = managerName;
            Number = number;
            Email = email;
            City = city;
            District = district;
            OpenAddress = openAddress;
            TaxRate = taxRate;
        }

        public void UpdateDayEndSettings(TimeOnly dayEndTime, string timeZoneId)
        {
            if (string.IsNullOrWhiteSpace(timeZoneId))
                throw new DomainException("Geçersiz saat dilimi.");

            try
            {
                TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            }
            catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
            {
                throw new DomainException("Geçersiz saat dilimi.");
            }

            DayEndTime = dayEndTime;
            TimeZoneId = timeZoneId;
        }

        // ── Varsayılanlara dön ("Verileri sil" → Sıfırla) ──────────────────────────────────────────────
        // Yeni kayıt olmuş bir restoranın değerleri. Şubenin adı ve şirketin adresi (slug) hiç değişmez.

        /// <summary>Türkiye'de yeme-içme hizmeti KDV oranı; kayıtta ilk şubeye yazılan değer.</summary>
        public const decimal DefaultTaxRate = 10m;
        public const string DefaultTimeZoneId = "Europe/Istanbul";

        /// <summary>Açılış/kapanış, saat notu ve haftalık saatler (yayındaki site ve taslak) silinir.</summary>
        public void ResetWorkingHours()
        {
            OpensAt = null;
            ClosesAt = null;
            HoursNote = string.Empty;
            if (SiteContent is { } content)
                SiteContent = content with { WeeklyHours = [] };
            if (SiteDraft is { } draft)
                SiteDraft = draft with { OpensAt = null, ClosesAt = null, HoursNote = string.Empty, Content = draft.Content with { WeeklyHours = [] } };
        }

        /// <summary>
        /// Sitenin metinleri, fotoğrafları, teması ve taslağı silinir; çalışma saatleri korunur (onlar ayrı bir maddedir).
        /// Artık kullanılmayan fotoğraf anahtarlarını döner (dosyaları silmek çağıranın işi; paylaşılan anahtarlar silinmez).
        /// </summary>
        public IReadOnlyList<string> ResetSite()
        {
            List<string> keys = [.. SiteImageKeysInUse()];
            IReadOnlyList<SiteDayHours> weeklyHours = GetSiteContent().WeeklyHours;

            SiteHeadline = string.Empty;
            SiteTagline = string.Empty;
            SiteStoryTitle = string.Empty;
            SiteAbout = string.Empty;
            SiteCoverImage = string.Empty;
            SiteAboutImage = string.Empty;
            InstagramUrl = string.Empty;
            SiteAccentColor = string.Empty;
            SiteContent = weeklyHours.Count > 0 ? Entities.SiteContent.Empty with { WeeklyHours = weeklyHours } : null;
            SiteDraft = null;
            SiteDraftVersion++;
            SiteDraftUpdatedAt = null;
            SitePublishedAt = null;
            return keys;
        }

        /// <summary>Yönetici, telefon ve e-posta kayıttaki gibi sahibin bilgileri olur; adres boşalır, KDV %10'a döner.</summary>
        public void ResetInfo(string managerName, string number, string email)
        {
            ManagerName = managerName;
            Number = number;
            Email = email;
            City = string.Empty;
            District = string.Empty;
            OpenAddress = string.Empty;
            TaxRate = DefaultTaxRate;
        }

        public void ResetDayEnd()
        {
            DayEndTime = new TimeOnly(0, 0);
            TimeZoneId = DefaultTimeZoneId;
        }

        public void ResetPaymentSettings()
        {
            Iban = string.Empty;
            IbanHolderName = string.Empty;
        }

        public void ResetOnlineOrdering()
        {
            OnlineOrderSettings = null;
            OnlineOrdersPaused = false;
        }

        public void EnsureCanBeDeleted(IEnumerable<Region> linkedRegions, IEnumerable<UserBranch> linkedStaff)
        {
            if (linkedRegions.Any())
                throw new DomainException("Bu şubeye bağlı bölgeler bulunmaktadır. Lütfen silmeden önce ilgili bölgeleri kaldırın.");

            if (linkedStaff.Any())
                throw new DomainException("Bu şubeye atanmış personel bulunmaktadır. Lütfen silmeden önce personeli kaldırın veya başka bir şubeye taşıyın.");
        }
    }
}
