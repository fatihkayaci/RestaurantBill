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
        // Yalnızca müşteri taleplerinde dolu; personelin açtığı eski kayıtlarda null.
        public DateTime? EndTime { get; private set; }
        public int PartySize { get; private set; }
        public string Note { get; private set; } = string.Empty;
        public ReservationStatus Status { get; private set; } = ReservationStatus.Active;

        protected Reservation() { }

        public static Reservation Create(Table table, string guestName, string contact, DateTime reservationTime, string note)
        {
            if (table == null)
                throw new DomainException("Geçersiz masa.");

            if (string.IsNullOrWhiteSpace(guestName))
                throw new DomainException("Misafir adı boş olamaz.");

            return new Reservation
            {
                Table = table,
                GuestName = guestName,
                Contact = contact ?? string.Empty,
                ReservationTime = reservationTime,
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
    }
}
