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

        public void UpdateSite(string headline, string tagline, string storyTitle, string about, TimeOnly? opensAt, TimeOnly? closesAt,
            string hoursNote, string instagramUrl, string accentColor)
        {
            if ((opensAt is null) != (closesAt is null))
                throw new DomainException("Açılış ve kapanış saatini birlikte girin ya da ikisini de boş bırakın.");

            string accent = accentColor.Trim();
            if (accent.Length > 0 && !System.Text.RegularExpressions.Regex.IsMatch(accent, "^#[0-9A-Fa-f]{6}$"))
                throw new DomainException("Vurgu rengi #RRGGBB biçiminde olmalıdır.");

            string instagram = instagramUrl.Trim();
            if (instagram.Length > 0 && !instagram.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                throw new DomainException("Instagram adresi https:// ile başlamalıdır.");

            SiteHeadline = headline.Trim();
            SiteTagline = tagline.Trim();
            SiteStoryTitle = storyTitle.Trim();
            SiteAbout = about.Trim();
            OpensAt = opensAt;
            ClosesAt = closesAt;
            HoursNote = hoursNote.Trim();
            InstagramUrl = instagram;
            SiteAccentColor = accent.ToUpperInvariant();
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
            else
            {
                previous = SiteAboutImage;
                SiteAboutImage = key;
            }
            return previous;
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

        public void EnsureCanBeDeleted(IEnumerable<Region> linkedRegions, IEnumerable<UserBranch> linkedStaff)
        {
            if (linkedRegions.Any())
                throw new DomainException("Bu şubeye bağlı bölgeler bulunmaktadır. Lütfen silmeden önce ilgili bölgeleri kaldırın.");

            if (linkedStaff.Any())
                throw new DomainException("Bu şubeye atanmış personel bulunmaktadır. Lütfen silmeden önce personeli kaldırın veya başka bir şubeye taşıyın.");
        }
    }
}
