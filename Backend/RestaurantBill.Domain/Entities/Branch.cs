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

        // Şubenin site bilgileri. Restoran sitesi şirket geneli tek sitedir (Company.Site); şubeye ait olanlar burada:
        // çalışma saatleri (tek aralık + haftalık), saat notu, WhatsApp ve "nasıl gelinir". Müşteri sitesi seçilen şubenin
        // bu bilgilerini şirketin sitesine ekler (SiteFor). Tek aralık rezervasyon ve online sipariş varsayılanlarını da besler.
        public TimeOnly? OpensAt { get; private set; }
        public TimeOnly? ClosesAt { get; private set; }
        public string HoursNote { get; private set; } = string.Empty;

        // Kasada "IBAN ile ödeme" için: boşluksuz, büyük harf "TR..." (26 karakter) ve hesap sahibinin adı.
        // İkisi de boşsa IBAN ile ödeme kapalıdır.
        public string Iban { get; private set; } = string.Empty;
        public string IbanHolderName { get; private set; } = string.Empty;
        /// <summary>İsteğe bağlı banka adı ("Ziraat Bankası"); masa QR'ının "IBAN ile öde" penceresinde gösterilir.</summary>
        public string PaymentBankName { get; private set; } = string.Empty;
        /// <summary>Masa QR sayfasında "IBAN ile öde" görünsün mü (varsayılan kapalı). Geçerli IBAN olmadan açılamaz.</summary>
        public bool ShowIbanOnTable { get; private set; }

        public const int IbanHolderNameMaxLength = 100;
        public const int PaymentBankNameMaxLength = 60;

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

        /// <summary>Müşteriye gösterilebilecek IBAN var mı: geçerli TR IBAN ve hesap sahibi dolu (masa QR'ı ve online paket sipariş).</summary>
        public bool HasPayableIban => TurkishIban.IsValid(Iban) && IbanHolderName.Length > 0;

        /// <summary>Masa QR sayfasında "IBAN ile öde" gerçekten gösterilir mi: anahtar açık, IBAN geçerli ve hesap sahibi dolu.</summary>
        public bool ShowsIbanOnTable => ShowIbanOnTable && HasPayableIban;

        /// <summary>Online paket siparişte "IBAN ile öde" seçilebilir mi: ayarda açık ve gösterilebilecek IBAN var.</summary>
        public bool AcceptsIbanForDelivery => GetOnlineOrderSettings().AcceptIban && HasPayableIban;

        /// <summary>
        /// IBAN ve hesap sahibi ikisi de boş: IBAN'ı kaldırır (banka adı ve QR gösterimi de kapanır). Aksi halde geçerli bir
        /// TR IBAN ve hesap sahibi adı zorunludur; banka adı isteğe bağlıdır.
        /// </summary>
        public void SetIban(string? iban, string? holderName, string? bankName = null)
        {
            string normalized = TurkishIban.Normalize(iban);
            string holder = holderName?.Trim() ?? string.Empty;
            string bank = bankName?.Trim() ?? string.Empty;

            if (normalized.Length == 0 && holder.Length == 0)
            {
                // Online siparişin tek ödeme yöntemi IBAN ise müşteri ödeme seçemez hale gelirdi.
                if (OnlineOrderSettings is { AcceptIban: true, AcceptCash: false, AcceptCard: false })
                    throw new DomainException("Online paket siparişte tek ödeme yöntemi IBAN. Önce Online sipariş ayarlarından nakit ya da kartı açın.");

                Iban = string.Empty;
                IbanHolderName = string.Empty;
                PaymentBankName = string.Empty;
                ShowIbanOnTable = false;
                return;
            }

            if (!TurkishIban.IsValid(normalized))
                throw new DomainException("Geçerli bir IBAN girin: TR ile başlayan 26 karakter.");
            if (holder.Length == 0)
                throw new DomainException("Hesap sahibinin adını girin.");
            if (holder.Length > IbanHolderNameMaxLength)
                throw new DomainException($"Hesap sahibi adı en fazla {IbanHolderNameMaxLength} karakter olabilir.");
            if (bank.Length > PaymentBankNameMaxLength)
                throw new DomainException($"Banka adı en fazla {PaymentBankNameMaxLength} karakter olabilir.");

            Iban = normalized;
            IbanHolderName = holder;
            PaymentBankName = bank;
        }

        /// <summary>Masa QR sayfasındaki "IBAN ile öde" anahtarı; açmak için önce geçerli IBAN ve hesap sahibi kaydedilmiş olmalı.</summary>
        public void SetShowIbanOnTable(bool show)
        {
            if (show && !HasPayableIban)
                throw new DomainException("QR menüde göstermek için önce geçerli bir IBAN ve hesap sahibi girin.");
            ShowIbanOnTable = show;
        }

        public const int HoursNoteMaxLength = 80;

        /// <summary>
        /// Şubenin site bilgileri (jsonb, SiteContent şeklinde): yalnız WeeklyHours, DirectionsNote ve WhatsappPhone kullanılır;
        /// sitenin geri kalanı şirkettedir (<see cref="Company.Site"/>). null ise hiç kaydedilmemiş.
        /// </summary>
        public SiteContent? SiteContent { get; private set; }

        public SiteContent GetSiteContent() => SiteContent ?? Entities.SiteContent.Empty;

        /// <summary>
        /// Şubenin saatlerini, saat notunu, WhatsApp'ını ve "nasıl gelinir"ini kaydeder (taslak yok, hemen yayında; adres ve
        /// telefon gibi). Haftalık saat girildiyse tek aralık (OpensAt/ClosesAt) en sık görülen aralıkla güncellenir.
        /// </summary>
        public void UpdateSiteInfo(TimeOnly? opensAt, TimeOnly? closesAt, string hoursNote, IReadOnlyList<SiteDayHours> weeklyHours,
            string whatsappPhone, string directionsNote)
        {
            if ((opensAt is null) != (closesAt is null))
                throw new DomainException("Açılış ve kapanış saatini birlikte girin ya da ikisini de boş bırakın.");
            string note = (hoursNote ?? string.Empty).Trim();
            if (note.Length > HoursNoteMaxLength)
                throw new DomainException($"Saat notu en fazla {HoursNoteMaxLength} karakter olabilir.");

            SiteContent next = GetSiteContent().WithBranchInfo(weeklyHours, directionsNote, whatsappPhone);
            OpensAt = opensAt;
            ClosesAt = closesAt;
            if (next.MostCommonRange() is { } range)
            {
                OpensAt = range.Opens;
                ClosesAt = range.Closes;
            }
            HoursNote = note;
            SiteContent = next;
        }

        /// <summary>Şirketin sitesine bu şubenin bilgilerini (saatler, saat notu, WhatsApp, nasıl gelinir) ekler.</summary>
        public SiteSnapshot SiteFor(SiteSnapshot site)
        {
            SiteContent info = GetSiteContent();
            return site with
            {
                OpensAt = OpensAt,
                ClosesAt = ClosesAt,
                HoursNote = HoursNote,
                Content = site.Content with
                {
                    WeeklyHours = info.WeeklyHours,
                    DirectionsNote = info.DirectionsNote,
                    WhatsappPhone = info.WhatsappPhone,
                },
            };
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

        /// <summary>Açılış/kapanış, saat notu ve haftalık saatler silinir.</summary>
        public void ResetWorkingHours()
        {
            OpensAt = null;
            ClosesAt = null;
            HoursNote = string.Empty;
            if (SiteContent is { } content)
                SiteContent = content with { WeeklyHours = [] };
        }

        /// <summary>
        /// Sitenin şubeye ait kısmı (WhatsApp, nasıl gelinir) silinir; çalışma saatleri korunur (onlar ayrı bir maddedir).
        /// Sitenin kendisi şirkettedir: <see cref="Company.ResetSite"/>.
        /// </summary>
        public void ResetSiteInfo()
        {
            IReadOnlyList<SiteDayHours> weeklyHours = GetSiteContent().WeeklyHours;
            SiteContent = weeklyHours.Count > 0 ? Entities.SiteContent.Empty with { WeeklyHours = weeklyHours } : null;
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
            PaymentBankName = string.Empty;
            ShowIbanOnTable = false;
        }

        public void ResetOnlineOrdering()
        {
            OnlineOrderSettings = null;
            OnlineOrdersPaused = false;
        }

        // Şube silme yumuşaktır (IsDeleted): adisyon, ödeme, vardiya ve kayıt geçmişi raporlarda kalır; şube listelerden,
        // şube seçiciden, girişten ve müşteri sitesinden düşer. Bölge/masa/menü şubeyle birlikte gizlenir, ayrıca silinmez.
        // Engeller: şirketin son şubesi ve şubede hâlâ süren iş (personel, açık adisyon/vardiya/paket, yaklaşan rezervasyon).
        public void Delete(BranchDeletionBlockers blockers)
        {
            EnsureCanBeDeleted(blockers);
            MarkAsDeleted();
        }

        public void EnsureCanBeDeleted(BranchDeletionBlockers blockers)
        {
            if (IsDeleted)
                throw new DomainException("Bu şube zaten silinmiş.");

            if (blockers.OtherActiveBranchCount <= 0)
                throw new DomainException("Restoranın son şubesi silinemez. Önce yeni bir şube ekleyin ya da bu şubenin bilgilerini düzenleyin.");

            List<string> reasons = [];
            if (blockers.StaffCount > 0)
                reasons.Add($"şubeye atanmış {blockers.StaffCount} personel var (Personel sayfasından başka şubeye taşıyın ya da silin)");
            if (blockers.OpenOrderCount > 0)
                reasons.Add($"{blockers.OpenOrderCount} açık adisyon var (ödemesini alın ya da iptal edin)");
            if (blockers.OpenShiftCount > 0)
                reasons.Add($"{blockers.OpenShiftCount} açık vardiya var (vardiyayı kapatın)");
            if (blockers.OpenDeliveryOrderCount > 0)
                reasons.Add($"{blockers.OpenDeliveryOrderCount} sonuçlanmamış paket sipariş var (teslim edin ya da iptal edin)");
            if (blockers.UpcomingReservationCount > 0)
                reasons.Add($"{blockers.UpcomingReservationCount} yaklaşan rezervasyon var (iptal edin ya da reddedin)");

            if (reasons.Count > 0)
                throw new DomainException($"Şube silinemedi: {string.Join("; ", reasons)}.");
        }
    }

    /// <summary>Şube silinmeden önce sayılan engeller. Hepsi sıfır (ve başka şube varsa) silme serbesttir.</summary>
    public sealed record BranchDeletionBlockers(
        int OtherActiveBranchCount,
        int StaffCount = 0,
        int OpenOrderCount = 0,
        int OpenShiftCount = 0,
        int OpenDeliveryOrderCount = 0,
        int UpcomingReservationCount = 0);
}
