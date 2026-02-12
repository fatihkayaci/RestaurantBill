using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Domain.Entities
{
    public class User : BaseEntity
    {
        public required string FullName { get; set; }
        public required string UserName { get; set; }
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public required string PasswordHash { get; set; }
        public required string UserCode { get; set; }
        public UserRole Role { get; set; } = UserRole.Waiter;
    }
}