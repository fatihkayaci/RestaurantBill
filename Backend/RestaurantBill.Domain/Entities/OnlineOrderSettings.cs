using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    /// <summary>Bir gün için online sipariş saatleri: açılış ve kapanış (şubenin saat diliminde).</summary>
    public sealed class OnlineOrderDayHours
    {
        /// <summary>"24 saat" gününün kapanışı: 00:00–23:59 kaydı gün boyu açık demektir (bkz. <see cref="IsAllDay"/>).</summary>
        public static readonly TimeOnly AllDayCloses = new(23, 59);

        public DayOfWeek Day { get; }
        public bool IsOpen { get; }
        public TimeOnly Opens { get; }
        /// <summary>Açılıştan küçük ya da eşitse gece yarısını aşar (18:00–02:00).</summary>
        public TimeOnly Closes { get; }

        public OnlineOrderDayHours(DayOfWeek day, bool isOpen, TimeOnly opens, TimeOnly closes)
        {
            Day = day;
            IsOpen = isOpen;
            Opens = opens;
            Closes = closes;
        }

        /// <summary>
        /// Gün boyu açık mı: 00:00–23:59. Böyle bir gün ertesi gece yarısına kadar sürer ve son sipariş kesintisi uygulanmaz;
        /// ertesi gün de açıksa sipariş alma kesintisiz devam eder.
        /// </summary>
        public bool IsAllDay => IsOpen && Opens == TimeOnly.MinValue && Closes == AllDayCloses;
    }

    /// <summary>
    /// Şubenin online paket sipariş ve rezervasyon ön sipariş kuralları (değişmez değer nesnesi). Şubede hiç
    /// kaydedilmemişse <see cref="Default"/> geçerlidir: online sipariş kapalı.
    /// </summary>
    public sealed class OnlineOrderSettings
    {
        public const int LastOrderMinutesMax = 120;
        public const int EtaMin = 10;
        public const int EtaMax = 180;
        public const int AutoRejectMin = 3;
        public const int AutoRejectMax = 60;
        public const int OpenOrdersPerPhoneMax = 10;
        public const int OrdersPerPhonePerDayMax = 50;
        public const int PreOrderLeadMin = 15;
        public const int PreOrderLeadMax = 24 * 60;

        public const int DefaultLastOrderMinutesBeforeClose = 30;
        public const int DefaultEta = 45;
        public const int DefaultAutoRejectAfterMinutes = 10;
        public const int DefaultMaxOpenOrdersPerPhone = 2;
        public const int DefaultMaxOrdersPerPhonePerDay = 5;
        public const int DefaultPreOrderLeadMinutes = 60;
        public const int DefaultPickupEta = 20;

        private static readonly TimeOnly DefaultOpens = new(11, 0);
        private static readonly TimeOnly DefaultCloses = new(22, 0);

        public bool Enabled { get; }
        /// <summary>Her gün için tam bir kayıt, Pazartesi → Pazar.</summary>
        public IReadOnlyList<OnlineOrderDayHours> Days { get; }
        /// <summary>Kapanıştan bu kadar dakika önce yeni sipariş alınmaz.</summary>
        public int LastOrderMinutesBeforeClose { get; }
        /// <summary>Kabulde önerilen teslim süresi (dakika); bölgenin süresi varsa o kullanılır.</summary>
        public int DefaultEtaMinutes { get; }
        /// <summary>Yanıtlanmayan sipariş bu kadar dakika sonra otomatik reddedilir.</summary>
        public int AutoRejectAfterMinutes { get; }
        public int MaxOpenOrdersPerPhone { get; }
        public int MaxOrdersPerPhonePerDay { get; }
        public bool AcceptCash { get; }
        public bool AcceptCard { get; }
        /// <summary>Müşteri havale/EFT ile öder; yalnızca şubede geçerli IBAN ve hesap sahibi varken kullanılır (bkz. Branch.HasPayableIban).</summary>
        public bool AcceptIban { get; }
        /// <summary>SMS kodu ile telefon doğrulaması; SMS sağlayıcısı yapılandırılmadıysa etkisizdir.</summary>
        public bool RequirePhoneVerification { get; }
        public bool PreOrderEnabled { get; }
        /// <summary>Ön sipariş, rezervasyon saatinden bu kadar dakika önce açılır.</summary>
        public int PreOrderLeadMinutes { get; }
        /// <summary>
        /// "Gel al": müşteri online sipariş verip restorandan kendisi alır (adres, bölge ve teslimat ücreti yok). Online sipariş
        /// açıkken geçerlidir; varsayılan kapalı, işletme açar.
        /// </summary>
        public bool PickupEnabled { get; }
        /// <summary>Gel al siparişinde kabulde önerilen hazır olma süresi (dakika); müşteriye "~N dk'da hazır" diye gösterilir.</summary>
        public int PickupEtaMinutes { get; }

        private OnlineOrderSettings(bool enabled, IReadOnlyList<OnlineOrderDayHours> days, int lastOrderMinutesBeforeClose, int defaultEtaMinutes,
            int autoRejectAfterMinutes, int maxOpenOrdersPerPhone, int maxOrdersPerPhonePerDay, bool acceptCash, bool acceptCard, bool acceptIban,
            bool requirePhoneVerification, bool preOrderEnabled, int preOrderLeadMinutes, bool pickupEnabled, int pickupEtaMinutes)
        {
            PickupEnabled = pickupEnabled;
            PickupEtaMinutes = pickupEtaMinutes;
            Enabled = enabled;
            Days = days;
            LastOrderMinutesBeforeClose = lastOrderMinutesBeforeClose;
            DefaultEtaMinutes = defaultEtaMinutes;
            AutoRejectAfterMinutes = autoRejectAfterMinutes;
            MaxOpenOrdersPerPhone = maxOpenOrdersPerPhone;
            MaxOrdersPerPhonePerDay = maxOrdersPerPhonePerDay;
            AcceptCash = acceptCash;
            AcceptCard = acceptCard;
            AcceptIban = acceptIban;
            RequirePhoneVerification = requirePhoneVerification;
            PreOrderEnabled = preOrderEnabled;
            PreOrderLeadMinutes = preOrderLeadMinutes;
        }

        /// <summary>Admin'in kaydettiği ayarlar; kurallara uymayan değerde DomainException.</summary>
        public static OnlineOrderSettings Create(bool enabled, IEnumerable<OnlineOrderDayHours> days, int lastOrderMinutesBeforeClose, int defaultEtaMinutes,
            int autoRejectAfterMinutes, int maxOpenOrdersPerPhone, int maxOrdersPerPhonePerDay, bool acceptCash, bool acceptCard,
            bool requirePhoneVerification, bool preOrderEnabled, int preOrderLeadMinutes, bool acceptIban = false,
            bool pickupEnabled = false, int pickupEtaMinutes = DefaultPickupEta)
        {
            if (pickupEtaMinutes < EtaMin || pickupEtaMinutes > EtaMax)
                throw new DomainException($"Gel al hazır olma süresi {EtaMin}–{EtaMax} dakika arasında olmalı.");
            if (lastOrderMinutesBeforeClose < 0 || lastOrderMinutesBeforeClose > LastOrderMinutesMax)
                throw new DomainException($"Son sipariş süresi 0–{LastOrderMinutesMax} dakika arasında olmalı.");
            if (defaultEtaMinutes < EtaMin || defaultEtaMinutes > EtaMax)
                throw new DomainException($"Tahmini teslim süresi {EtaMin}–{EtaMax} dakika arasında olmalı.");
            if (autoRejectAfterMinutes < AutoRejectMin || autoRejectAfterMinutes > AutoRejectMax)
                throw new DomainException($"Otomatik ret süresi {AutoRejectMin}–{AutoRejectMax} dakika arasında olmalı.");
            if (maxOpenOrdersPerPhone < 1 || maxOpenOrdersPerPhone > OpenOrdersPerPhoneMax)
                throw new DomainException($"Bir numaranın açık sipariş sınırı 1–{OpenOrdersPerPhoneMax} arasında olmalı.");
            if (maxOrdersPerPhonePerDay < 1 || maxOrdersPerPhonePerDay > OrdersPerPhonePerDayMax)
                throw new DomainException($"Bir numaranın günlük sipariş sınırı 1–{OrdersPerPhonePerDayMax} arasında olmalı.");
            if (maxOrdersPerPhonePerDay < maxOpenOrdersPerPhone)
                throw new DomainException("Günlük sipariş sınırı açık sipariş sınırından küçük olamaz.");
            if (!acceptCash && !acceptCard && !acceptIban)
                throw new DomainException("En az bir ödeme yöntemi (nakit, kart ya da IBAN) açık olmalı.");
            if (preOrderLeadMinutes < PreOrderLeadMin || preOrderLeadMinutes > PreOrderLeadMax)
                throw new DomainException($"Ön sipariş süresi {PreOrderLeadMin}–{PreOrderLeadMax} dakika arasında olmalı.");

            List<OnlineOrderDayHours> list = days?.ToList() ?? [];
            if (list.Count != 7 || list.Select(d => d.Day).Distinct().Count() != 7)
                throw new DomainException("Haftanın her günü için bir satır gönderilmeli.");

            OnlineOrderDayHours? sameHours = list.FirstOrDefault(d => d.IsOpen && d.Opens == d.Closes);
            if (sameHours is not null)
                throw new DomainException($"{ReservationSettings.DayName(sameHours.Day)}: açılış ve kapanış saati aynı olamaz.");

            return new OnlineOrderSettings(enabled, Ordered(list), lastOrderMinutesBeforeClose, defaultEtaMinutes, autoRejectAfterMinutes,
                maxOpenOrdersPerPhone, maxOrdersPerPhonePerDay, acceptCash, acceptCard, acceptIban, requirePhoneVerification, preOrderEnabled, preOrderLeadMinutes,
                pickupEnabled, pickupEtaMinutes);
        }

        /// <summary>Yalnızca veritabanından okurken: kayıtlı değer, bugünkü sınırlar değişmiş olsa da olduğu gibi yüklenir.</summary>
        public static OnlineOrderSettings Restore(bool enabled, IEnumerable<OnlineOrderDayHours> days, int lastOrderMinutesBeforeClose, int defaultEtaMinutes,
            int autoRejectAfterMinutes, int maxOpenOrdersPerPhone, int maxOrdersPerPhonePerDay, bool acceptCash, bool acceptCard,
            bool requirePhoneVerification, bool preOrderEnabled, int preOrderLeadMinutes, bool acceptIban = false,
            bool pickupEnabled = false, int pickupEtaMinutes = DefaultPickupEta)
        {
            List<OnlineOrderDayHours> list = days.GroupBy(d => d.Day).Select(g => g.First()).ToList();
            // Eksik gün kapalı sayılır.
            foreach (DayOfWeek missing in ReservationSettings.WeekOrder.Where(d => list.All(x => x.Day != d)))
                list.Add(new OnlineOrderDayHours(missing, false, DefaultOpens, DefaultCloses));
            return new OnlineOrderSettings(enabled, Ordered(list), lastOrderMinutesBeforeClose, defaultEtaMinutes, autoRejectAfterMinutes,
                maxOpenOrdersPerPhone, maxOrdersPerPhonePerDay, acceptCash, acceptCard, acceptIban, requirePhoneVerification, preOrderEnabled, preOrderLeadMinutes,
                pickupEnabled, pickupEtaMinutes);
        }

        /// <summary>
        /// Hiç ayar kaydedilmemiş şube: online sipariş ve ön sipariş kapalı. Saatler şubenin açılış/kapanışından,
        /// girilmemişse 11:00–22:00; 10 dakikada yanıtlanmayan sipariş otomatik reddedilir.
        /// </summary>
        public static OnlineOrderSettings Default(TimeOnly? opensAt, TimeOnly? closesAt)
        {
            TimeOnly opens = opensAt ?? DefaultOpens;
            TimeOnly closes = closesAt ?? DefaultCloses;
            if (opens == closes)
                (opens, closes) = (DefaultOpens, DefaultCloses);

            List<OnlineOrderDayHours> days = ReservationSettings.WeekOrder.Select(d => new OnlineOrderDayHours(d, true, opens, closes)).ToList();
            return new OnlineOrderSettings(false, days, DefaultLastOrderMinutesBeforeClose, DefaultEta, DefaultAutoRejectAfterMinutes,
                DefaultMaxOpenOrdersPerPhone, DefaultMaxOrdersPerPhonePerDay, acceptCash: true, acceptCard: true, acceptIban: false,
                requirePhoneVerification: false, preOrderEnabled: false, DefaultPreOrderLeadMinutes, pickupEnabled: false, DefaultPickupEta);
        }

        /// <summary>
        /// Yalnızca IBAN ile ödeme anahtarı değişmiş kopya (Ayarlar → Ödeme ve Online sipariş'teki anahtar). Diğer alanlar
        /// olduğu gibi kalır; kapatınca hiç ödeme yöntemi kalmıyorsa DomainException.
        /// </summary>
        public OnlineOrderSettings WithAcceptIban(bool acceptIban)
        {
            if (!acceptIban && !AcceptCash && !AcceptCard)
                throw new DomainException("Online paket siparişte tek ödeme yöntemi IBAN. Kapatmak için önce Online sipariş ayarlarından nakit ya da kartı açın.");
            return new OnlineOrderSettings(Enabled, Days, LastOrderMinutesBeforeClose, DefaultEtaMinutes, AutoRejectAfterMinutes,
                MaxOpenOrdersPerPhone, MaxOrdersPerPhonePerDay, AcceptCash, AcceptCard, acceptIban, RequirePhoneVerification,
                PreOrderEnabled, PreOrderLeadMinutes, PickupEnabled, PickupEtaMinutes);
        }

        public OnlineOrderDayHours For(DayOfWeek day) => Days.First(d => d.Day == day);

        private static List<OnlineOrderDayHours> Ordered(List<OnlineOrderDayHours> days)
            => ReservationSettings.WeekOrder.Select(d => days.First(x => x.Day == d)).ToList();
    }
}
