using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs
{
    public class MembershipDto
    {
        public Guid Id { get; set; }
        public MembershipPlanType PlanType { get; set; }
        public MembershipStatus Status { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }
}
