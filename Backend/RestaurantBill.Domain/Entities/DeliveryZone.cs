using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    // Şubenin paket servis yaptığı mahalle: teslimat ücreti, en az sipariş tutarı ve tahmini süre.
    public class DeliveryZone : BaseEntity
    {
        public const int NameMaxLength = 80;
        public const decimal FeeMax = 1000m;
        public const decimal MinOrderAmountMax = 10000m;
        public const int EstimatedMinutesMin = 10;
        public const int EstimatedMinutesMax = 180;

        public Guid BranchId { get; private set; }
        public string Name { get; private set; } = string.Empty;
        public decimal Fee { get; private set; }
        public decimal MinOrderAmount { get; private set; }
        public int EstimatedMinutes { get; private set; }
        public bool IsActive { get; private set; } = true;
        public int SortOrder { get; private set; }

        protected DeliveryZone() { }

        public static DeliveryZone Create(Guid branchId, string name, decimal fee, decimal minOrderAmount, int estimatedMinutes, int sortOrder)
        {
            if (branchId == Guid.Empty)
                throw new DomainException("Geçersiz şube.");

            DeliveryZone zone = new() { BranchId = branchId, IsActive = true };
            zone.Update(name, fee, minOrderAmount, estimatedMinutes, sortOrder);
            return zone;
        }

        public void Update(string name, decimal fee, decimal minOrderAmount, int estimatedMinutes, int sortOrder)
        {
            string trimmed = name?.Trim() ?? string.Empty;
            if (trimmed.Length == 0)
                throw new DomainException("Bölge adı boş olamaz.");
            if (trimmed.Length > NameMaxLength)
                throw new DomainException($"Bölge adı en fazla {NameMaxLength} karakter olabilir.");
            if (fee < 0 || fee > FeeMax)
                throw new DomainException($"Teslimat ücreti 0–{FeeMax:0} ₺ arasında olmalı.");
            if (minOrderAmount < 0 || minOrderAmount > MinOrderAmountMax)
                throw new DomainException($"En az sipariş tutarı 0–{MinOrderAmountMax:0} ₺ arasında olmalı.");
            if (estimatedMinutes < EstimatedMinutesMin || estimatedMinutes > EstimatedMinutesMax)
                throw new DomainException($"Tahmini süre {EstimatedMinutesMin}–{EstimatedMinutesMax} dakika arasında olmalı.");

            Name = trimmed;
            Fee = fee;
            MinOrderAmount = minOrderAmount;
            EstimatedMinutes = estimatedMinutes;
            SortOrder = sortOrder;
        }

        public void SetActive(bool isActive) => IsActive = isActive;
    }
}
