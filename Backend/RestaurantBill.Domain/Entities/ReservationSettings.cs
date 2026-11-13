using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    /// <summary>Bir gün için rezervasyon başlangıç aralığı: ilk ve son başlangıç saati (ikisi de dahil).</summary>
    public sealed class ReservationDayHours
    {
        public DayOfWeek Day { get; }
        public bool IsOpen { get; }
        public TimeOnly FirstStart { get; }
        public TimeOnly LastStart { get; }

        public ReservationDayHours(DayOfWeek day, bool isOpen, TimeOnly firstStart, TimeOnly lastStart)
        {
            Day = day;
            IsOpen = isOpen;
            FirstStart = firstStart;
            LastStart = lastStart;
        }
    }

    /// <summary>
    /// Şubenin rezervasyon kuralları (değişmez değer nesnesi). Şubede hiç kaydedilmemişse
    /// <see cref="Default"/> açılış/kapanış saatinden türetilir.
    /// </summary>
    public sealed class ReservationSettings
    {
        public static readonly IReadOnlyList<int> AllowedIntervals = [15, 30, 60];
        public const int DurationMin = 60;
        public const int DurationMax = 240;
        public const int DurationStep = 30;
        public const int DaysAheadMin = 1;
        public const int DaysAheadMax = 90;
        public const int PartySizeMin = 1;
        public const int PartySizeMax = 50;

        public const int DefaultIntervalMinutes = 30;
        public const int DefaultDurationMinutes = 120;
        public const int DefaultMaxDaysAhead = 60;
        public const int DefaultMaxPartySize = 20;

        private static readonly TimeOnly DefaultFirst = new(9, 0);
        private static readonly TimeOnly DefaultLast = new(21, 0);
        private static readonly TimeOnly LatestDefaultStart = new(23, 0);

        // Pazartesi → Pazar sırası (ekranda bu sırayla gösterilir).
        public static readonly IReadOnlyList<DayOfWeek> WeekOrder =
            [DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday];

        public bool Enabled { get; }
        public int SlotIntervalMinutes { get; }
        /// <summary>Masada kalma süresi: rezervasyonun bitişi = başlangıç + bu süre.</summary>
        public int DurationMinutes { get; }
        public int MaxDaysAhead { get; }
        public int MaxPartySize { get; }
        /// <summary>Her gün için tam bir kayıt, Pazartesi → Pazar.</summary>
        public IReadOnlyList<ReservationDayHours> Days { get; }

        private ReservationSettings(bool enabled, int slotIntervalMinutes, int durationMinutes, int maxDaysAhead, int maxPartySize, IReadOnlyList<ReservationDayHours> days)
        {
            Enabled = enabled;
            SlotIntervalMinutes = slotIntervalMinutes;
            DurationMinutes = durationMinutes;
            MaxDaysAhead = maxDaysAhead;
            MaxPartySize = maxPartySize;
            Days = days;
        }

        /// <summary>Admin'in kaydettiği ayarlar; kurallara uymayan değerde DomainException.</summary>
        public static ReservationSettings Create(bool enabled, int slotIntervalMinutes, int durationMinutes, int maxDaysAhead, int maxPartySize,
            IEnumerable<ReservationDayHours> days)
        {
            if (!AllowedIntervals.Contains(slotIntervalMinutes))
                throw new DomainException("Saat aralığı 15, 30 ya da 60 dakika olmalı.");
            if (durationMinutes < DurationMin || durationMinutes > DurationMax || durationMinutes % DurationStep != 0)
                throw new DomainException($"Masada kalma süresi {DurationMin}–{DurationMax} dakika arasında ve {DurationStep} dakikanın katı olmalı.");
            if (maxDaysAhead < DaysAheadMin || maxDaysAhead > DaysAheadMax)
                throw new DomainException($"En fazla kaç gün sonrası {DaysAheadMin}–{DaysAheadMax} arasında olmalı.");
            if (maxPartySize < PartySizeMin || maxPartySize > PartySizeMax)
                throw new DomainException($"En fazla kişi sayısı {PartySizeMin}–{PartySizeMax} arasında olmalı.");

            List<ReservationDayHours> list = days?.ToList() ?? [];
            if (list.Count != 7 || list.Select(d => d.Day).Distinct().Count() != 7)
                throw new DomainException("Haftanın her günü için bir satır gönderilmeli.");

            foreach (ReservationDayHours day in list.Where(d => d.IsOpen))
            {
                if (day.LastStart < day.FirstStart)
                    throw new DomainException($"{DayName(day.Day)}: son başlangıç saati ilk başlangıç saatinden önce olamaz.");
            }

            return new ReservationSettings(enabled, slotIntervalMinutes, durationMinutes, maxDaysAhead, maxPartySize, Ordered(list));
        }

        /// <summary>Yalnızca veritabanından okurken: kayıtlı değer, bugünkü sınırlar değişmiş olsa da olduğu gibi yüklenir.</summary>
        public static ReservationSettings Restore(bool enabled, int slotIntervalMinutes, int durationMinutes, int maxDaysAhead, int maxPartySize,
            IEnumerable<ReservationDayHours> days)
        {
            List<ReservationDayHours> list = days.ToList();
            // Eksik gün kapalı sayılır.
            foreach (DayOfWeek missing in WeekOrder.Where(d => list.All(x => x.Day != d)))
                list.Add(new ReservationDayHours(missing, false, DefaultFirst, DefaultLast));
            return new ReservationSettings(enabled, slotIntervalMinutes, durationMinutes, maxDaysAhead, maxPartySize,
                Ordered(list.GroupBy(d => d.Day).Select(g => g.First()).ToList()));
        }

        /// <summary>
        /// Hiç ayar kaydedilmemiş şube: her gün açık, 30 dk aralık, 2 saat, 60 gün, 20 kişi. İlk başlangıç açılış saati
        /// (en erken 09:00), son başlangıç kapanıştan 2 saat önce (en geç 23:00); saat girilmemişse 09:00–21:00.
        /// </summary>
        public static ReservationSettings Default(TimeOnly? opensAt, TimeOnly? closesAt)
        {
            int interval = DefaultIntervalMinutes;
            int duration = DefaultDurationMinutes;
            TimeOnly first = DefaultFirst;
            TimeOnly last = DefaultLast;

            if (opensAt is TimeOnly opens && closesAt is TimeOnly closes)
            {
                int openMinutes = opens.Hour * 60 + opens.Minute;
                // Açılışı aralığa yukarı yuvarla (12:10 → 12:30).
                openMinutes = (openMinutes + interval - 1) / interval * interval;
                int firstMinutes = Math.Max(openMinutes, DefaultFirst.Hour * 60);

                int closeMinutes = closes.Hour * 60 + closes.Minute;
                if (closeMinutes <= opens.Hour * 60 + opens.Minute) closeMinutes += 24 * 60; // gece yarısını aşan çalışma saati
                int lastMinutes = Math.Min(closeMinutes - duration, LatestDefaultStart.Hour * 60);

                if (firstMinutes <= 23 * 60 + 59)
                {
                    first = new TimeOnly(firstMinutes / 60, firstMinutes % 60);
                    last = lastMinutes >= firstMinutes ? new TimeOnly(lastMinutes / 60, lastMinutes % 60) : first;
                }
            }

            List<ReservationDayHours> days = WeekOrder.Select(d => new ReservationDayHours(d, true, first, last)).ToList();
            return new ReservationSettings(true, interval, duration, DefaultMaxDaysAhead, DefaultMaxPartySize, days);
        }

        public ReservationDayHours For(DayOfWeek day) => Days.First(d => d.Day == day);

        /// <summary>O günün rezervasyon başlangıçları: ilk saatten aralıkla, son saate kadar (dahil). Kapalı günde boş.</summary>
        public IReadOnlyList<TimeOnly> StartTimes(DayOfWeek day)
        {
            ReservationDayHours hours = For(day);
            if (!hours.IsOpen) return [];

            var times = new List<TimeOnly>();
            int last = hours.LastStart.Hour * 60 + hours.LastStart.Minute;
            for (int m = hours.FirstStart.Hour * 60 + hours.FirstStart.Minute; m <= last; m += SlotIntervalMinutes)
                times.Add(new TimeOnly(m / 60, m % 60));
            return times;
        }

        public bool IsStartTime(DayOfWeek day, TimeOnly time) => StartTimes(day).Contains(time);

        public static string DayName(DayOfWeek day) => day switch
        {
            DayOfWeek.Monday => "Pazartesi",
            DayOfWeek.Tuesday => "Salı",
            DayOfWeek.Wednesday => "Çarşamba",
            DayOfWeek.Thursday => "Perşembe",
            DayOfWeek.Friday => "Cuma",
            DayOfWeek.Saturday => "Cumartesi",
            _ => "Pazar",
        };

        private static List<ReservationDayHours> Ordered(List<ReservationDayHours> days)
            => WeekOrder.Select(d => days.First(x => x.Day == d)).ToList();
    }
}
