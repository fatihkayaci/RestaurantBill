using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    // Restoran sitesinin İletişim sayfasından ziyaretçinin bıraktığı öneri/şikâyet. Admin "Şikayet ve Öneriler"de okur.
    public class ContactMessage : BaseEntity
    {
        public const int NameMaxLength = 100;
        public const int ContactMaxLength = 100;
        public const int MessageMinLength = 5;
        public const int MessageMaxLength = 2000;

        public Guid BranchId { get; private set; }
        public string Name { get; private set; } = string.Empty;
        /// <summary>Telefon ya da e-posta; isteğe bağlı, boş olabilir.</summary>
        public string Contact { get; private set; } = string.Empty;
        public ContactMessageType Type { get; private set; }
        public string Message { get; private set; } = string.Empty;
        public bool IsRead { get; private set; }
        public DateTime? ReadAt { get; private set; }

        protected ContactMessage() { }

        public static ContactMessage Create(Guid branchId, string name, string? contact, ContactMessageType type, string message)
        {
            if (branchId == Guid.Empty)
                throw new DomainException("Geçersiz şube.");

            string trimmedName = name?.Trim() ?? string.Empty;
            if (trimmedName.Length == 0)
                throw new DomainException("Adınızı girin.");
            if (trimmedName.Length > NameMaxLength)
                throw new DomainException($"Ad en fazla {NameMaxLength} karakter olabilir.");

            string trimmedContact = contact?.Trim() ?? string.Empty;
            if (trimmedContact.Length > ContactMaxLength)
                throw new DomainException($"İletişim bilgisi en fazla {ContactMaxLength} karakter olabilir.");

            if (!Enum.IsDefined(type))
                throw new DomainException("Mesaj türünü seçin.");

            string trimmedMessage = message?.Trim() ?? string.Empty;
            if (trimmedMessage.Length < MessageMinLength)
                throw new DomainException($"Mesajınız en az {MessageMinLength} karakter olmalı.");
            if (trimmedMessage.Length > MessageMaxLength)
                throw new DomainException($"Mesajınız en fazla {MessageMaxLength} karakter olabilir.");

            return new ContactMessage
            {
                BranchId = branchId,
                Name = trimmedName,
                Contact = trimmedContact,
                Type = type,
                Message = trimmedMessage
            };
        }

        // Tekrar okundu işaretlemek ilk okunma zamanını değiştirmez.
        public void MarkAsRead(DateTime nowUtc)
        {
            if (IsRead)
                return;
            IsRead = true;
            ReadAt = nowUtc;
        }
    }
}
