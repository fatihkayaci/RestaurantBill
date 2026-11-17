using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Domain.Entities
{
    // Şubenin online sipariş almadığı numara. Müşteri "Sipariş alınamadı, lütfen restoranı arayın." mesajını görür.
    public class BlockedPhone : BaseEntity
    {
        public const string CustomerMessage = "Sipariş alınamadı, lütfen restoranı arayın.";
        public const int ReasonMaxLength = 200;

        public Guid BranchId { get; private set; }
        /// <summary>TurkishPhone biçiminde: "+905321234567".</summary>
        public string Phone { get; private set; } = string.Empty;
        public string Reason { get; private set; } = string.Empty;
        public Guid BlockedByUserId { get; private set; }
        /// <summary>Engel panodaki bir siparişten konduysa o sipariş; elle eklenen numarada null.</summary>
        public Guid? SourceDeliveryOrderId { get; private set; }
        /// <summary>Engel yüzünden geri çevrilen sipariş denemeleri.</summary>
        public int BlockedAttemptCount { get; private set; }
        public DateTime? LastBlockedAttemptAt { get; private set; }

        protected BlockedPhone() { }

        /// <summary>Engelli numaradan gelen sipariş denemesi geri çevrildi.</summary>
        public void RegisterBlockedAttempt(DateTime utcNow)
        {
            BlockedAttemptCount++;
            LastBlockedAttemptAt = utcNow;
        }

        public static BlockedPhone Create(Guid branchId, string phone, string? reason, Guid blockedByUserId, Guid? sourceDeliveryOrderId = null)
        {
            if (branchId == Guid.Empty)
                throw new DomainException("Geçersiz şube.");

            string normalized = TurkishPhone.Normalize(phone);
            if (normalized.Length == 0)
                throw new DomainException("Geçerli bir telefon numarası girin.");

            string trimmed = reason?.Trim() ?? string.Empty;
            if (trimmed.Length > ReasonMaxLength)
                throw new DomainException($"Neden en fazla {ReasonMaxLength} karakter olabilir.");

            return new BlockedPhone
            {
                BranchId = branchId,
                Phone = normalized,
                Reason = trimmed,
                BlockedByUserId = blockedByUserId,
                SourceDeliveryOrderId = sourceDeliveryOrderId
            };
        }
    }
}
