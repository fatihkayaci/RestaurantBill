using Microsoft.AspNetCore.Identity;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Domain.Entities
{
    public class User : IdentityUser
    {
        public int RestaurantId { get; private set; }
        public string FullName { get; private set; } = string.Empty;
        public string UserCode { get; private set; } = string.Empty;
        public UserRole Role { get; private set; } = UserRole.Admin;

        public static User Create(string fullName, string userName, string? email, string? phoneNumber, string userCode, UserRole role, int restaurantId)
        {
            return new User
            {
                FullName = fullName,
                UserName = userName,
                Email = email,
                PhoneNumber = phoneNumber,
                UserCode = userCode,
                Role = role,
                RestaurantId = restaurantId
            };
        }

        public void Update(string fullName, string userName, string? email, string? phoneNumber, string userCode, UserRole role)
        {
            FullName = fullName;
            UserName = userName;
            Email = email;
            PhoneNumber = phoneNumber;
            UserCode = userCode;
            Role = role;
        }

        public void AssignRestaurant(int restaurantId)
        {
            RestaurantId = restaurantId;
        }
    }
}
