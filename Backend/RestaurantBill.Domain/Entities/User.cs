using Microsoft.AspNetCore.Identity;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Domain.Entities
{
    public class User : IdentityUser<int>
    {
        public required string FullName { get; set; }
        public required string UserCode { get; set; }
        public UserRole Role { get; set; } = UserRole.Admin; 
    }
}