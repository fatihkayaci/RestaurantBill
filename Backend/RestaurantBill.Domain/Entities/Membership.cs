using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class Membership : BaseEntity
    {
        public int RestaurantId { get; private set; }
        public Restaurant Restaurant { get; private set; } = default!;
        public MembershipPlanType PlanType { get; private set; }
        public MembershipStatus Status { get; private set; } = MembershipStatus.Active;
        public DateTime StartDate { get; private set; }
        public DateTime EndDate { get; private set; }

        protected Membership() { }

        public static Membership Create(Restaurant restaurant, MembershipPlanType planType, DateTime startDate, DateTime endDate)
        {
            if (restaurant == null)
                throw new DomainException("Geçersiz restoran.");

            if (endDate <= startDate)
                throw new DomainException("Bitiş tarihi başlangıç tarihinden sonra olmalı.");

            return new Membership
            {
                Restaurant = restaurant,
                PlanType = planType,
                StartDate = startDate,
                EndDate = endDate,
                Status = MembershipStatus.Active
            };
        }

        public void Cancel()
        {
            if (Status == MembershipStatus.Cancelled)
                throw new DomainException("Üyelik zaten iptal edilmiş.");

            Status = MembershipStatus.Cancelled;
        }

        public void Expire()
        {
            Status = MembershipStatus.Expired;
        }

        public bool IsCurrentlyActive()
        {
            return Status == MembershipStatus.Active && DateTime.UtcNow <= EndDate;
        }
    }
}
