using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class Reservation : BaseEntity
    {
        public int TableId { get; private set; }
        public Table Table { get; private set; } = default!;
        public string GuestName { get; private set; } = string.Empty;
        public string Contact { get; private set; } = string.Empty;
        public DateTime ReservationTime { get; private set; }
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

        public void Cancel()
        {
            if (Status != ReservationStatus.Active)
                throw new DomainException("Sadece aktif rezervasyonlar iptal edilebilir.");

            Status = ReservationStatus.Cancelled;
        }
    }
}
