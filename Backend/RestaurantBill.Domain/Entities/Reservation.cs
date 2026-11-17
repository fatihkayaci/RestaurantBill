using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class Reservation : BaseEntity
    {
        public Guid TableId { get; private set; }
        public Table Table { get; private set; } = default!;

        public string GuestName { get; private set; } = string.Empty;
        public string Contact { get; private set; } = string.Empty;
        public DateTime ReservationTime { get; private set; }
        // Müşteri taleplerinde ve personelin yeni açtığı kayıtlarda dolu; eski personel kayıtlarında null (2 saat sayılır).
        public DateTime? EndTime { get; private set; }
        public int PartySize { get; private set; }
        public string Note { get; private set; } = string.Empty;
        public ReservationStatus Status { get; private set; } = ReservationStatus.Active;
        // Müşteriye giden rezervasyon bağlantısının (ön sipariş) gizli anahtarı; kimlikten türetilmez.
        public string AccessToken { get; private set; } = Shared.AccessToken.New();
        // Telefonda okunabilen kısa kod (tiresiz saklanır, "K7M-2QP" diye gösterilir). Tek başına rezervasyonu açmaz:
        // "Rezervasyon sorgula" kodu telefon numarasıyla birlikte ister. Tüm sistemde tekildir; çakışırsa kaydeden
        // taraf RegenerateCode ile yenisini çeker.
        public string Code { get; private set; } = Shared.ReservationCode.New();
        public DateTime? SeatedAt { get; private set; }
        public DateTime? NoShowAt { get; private set; }

        protected Reservation() { }

        public static Reservation Create(Table table, string guestName, string contact, DateTime reservationTime, string note, DateTime? endTime = null)
        {
            if (table == null)
                throw new DomainException("Geçersiz masa.");

            if (string.IsNullOrWhiteSpace(guestName))
                throw new DomainException("Misafir adı boş olamaz.");
            if (endTime is DateTime end && end <= reservationTime)
                throw new DomainException("Geçersiz rezervasyon aralığı.");

            return new Reservation
            {
                Table = table,
                GuestName = guestName,
                Contact = contact ?? string.Empty,
                ReservationTime = reservationTime,
                EndTime = endTime,
                Note = note ?? string.Empty,
                Status = ReservationStatus.Active
            };
        }

        // Müşterinin siteden gönderdiği talep: restoran onaylayana kadar Pending kalır, masa durumuna dokunmaz.
        public static Reservation CreateRequest(Table table, string guestName, string contact, DateTime startUtc, DateTime endUtc, int partySize, string? note)
        {
            if (table == null)
                throw new DomainException("Geçersiz masa.");
            if (string.IsNullOrWhiteSpace(guestName))
                throw new DomainException("Misafir adı boş olamaz.");
            if (string.IsNullOrWhiteSpace(contact))
                throw new DomainException("Telefon numarası boş olamaz.");
            if (endUtc <= startUtc)
                throw new DomainException("Geçersiz rezervasyon aralığı.");
            if (partySize <= 0)
                throw new DomainException("Kişi sayısı 0'dan büyük olmalı.");

            return new Reservation
            {
                Table = table,
                TableId = table.Id,
                GuestName = guestName.Trim(),
                Contact = contact.Trim(),
                ReservationTime = startUtc,
                EndTime = endUtc,
                PartySize = partySize,
                Note = note?.Trim() ?? string.Empty,
                Status = ReservationStatus.Pending
            };
        }

        /// <summary>Kaydetmeden önce kodun başka bir rezervasyonda olduğu görülürse yeni bir kod çekilir.</summary>
        public void RegenerateCode() => Code = Shared.ReservationCode.New();

        public void Confirm()
        {
            if (Status != ReservationStatus.Pending)
                throw new DomainException("Sadece bekleyen rezervasyon talepleri onaylanabilir.");

            Status = ReservationStatus.Confirmed;
        }

        public void Reject()
        {
            if (Status != ReservationStatus.Pending)
                throw new DomainException("Sadece bekleyen rezervasyon talepleri reddedilebilir.");

            Status = ReservationStatus.Rejected;
        }

        public void Cancel()
        {
            if (Status != ReservationStatus.Active && Status != ReservationStatus.Confirmed && Status != ReservationStatus.Pending)
                throw new DomainException("Sadece aktif rezervasyonlar iptal edilebilir.");

            Status = ReservationStatus.Cancelled;
        }

        /// <summary>Misafir rezervasyonunu en geç bu kadar önce kendisi iptal edebilir; sonrası için restoranı arar.</summary>
        public static readonly TimeSpan GuestCancelCutoff = TimeSpan.FromHours(2);

        /// <summary>Misafirin kendi iptalinin son anı (rezervasyon saatinden GuestCancelCutoff önce).</summary>
        public DateTime GuestCancelDeadline => ReservationTime - GuestCancelCutoff;

        /// <summary>Misafir şu an kendisi iptal edebilir mi: bekleyen ya da onaylı ve son iptal anı geçmemiş.</summary>
        public bool CanGuestCancel(DateTime utcNow)
            => (Status == ReservationStatus.Pending || Status == ReservationStatus.Confirmed) && utcNow < GuestCancelDeadline;

        /// <summary>Misafirin kendi iptali (rezervasyon sayfasından, kod + telefonla).</summary>
        public void CancelByGuest(DateTime utcNow)
        {
            if (Status != ReservationStatus.Pending && Status != ReservationStatus.Confirmed)
                throw new DomainException("Bu rezervasyon zaten kapatılmış.");
            if (utcNow >= GuestCancelDeadline)
                throw new DomainException($"Rezervasyona {GuestCancelCutoff.TotalHours:0} saatten az kaldığı için online iptal edilemiyor. Lütfen restoranı arayın.");

            Status = ReservationStatus.Cancelled;
        }

        /// <summary>Misafir geldi ("Geldi"). Bekleyen ön sipariş varsa çağıran mutfağa gönderir.</summary>
        public void Seat(DateTime utcNow)
        {
            if (Status != ReservationStatus.Active && Status != ReservationStatus.Confirmed)
                throw new DomainException("Sadece aktif ya da onaylı rezervasyonun misafiri oturtulabilir.");

            Status = ReservationStatus.Seated;
            SeatedAt = utcNow;
        }

        public void MarkNoShow(DateTime utcNow)
        {
            if (Status != ReservationStatus.Active && Status != ReservationStatus.Confirmed)
                throw new DomainException("Sadece aktif ya da onaylı rezervasyon 'gelmedi' olarak işaretlenebilir.");

            if (utcNow < ReservationTime)
                throw new DomainException("Rezervasyon saati gelmeden 'gelmedi' işaretlenemez.");

            Status = ReservationStatus.NoShow;
            NoShowAt = utcNow;
        }
    }
}
