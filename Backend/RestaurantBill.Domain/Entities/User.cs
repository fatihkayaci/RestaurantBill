using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class User : BaseEntity
    {
        public string FullName { get; private set; } = string.Empty;
        public string UserName { get; private set; } = string.Empty;
        public string? Email { get; private set; }
        public string? PhoneNumber { get; private set; }
        public string UserCode { get; private set; } = string.Empty;
        public UserRole Role { get; private set; } = UserRole.Admin;
        public int RestaurantId { get; private set; }
        public Restaurant Restaurant { get; private set; } = default!;
        public string PasswordHash { get; private set; } = string.Empty;
        public bool IsActive { get; private set; } = true;

        protected User() { }

        public static User Create(string fullName, string userName, string? email, string? phoneNumber, string userCode, UserRole role, int restaurantId)
        {
            ValidateCommon(fullName, userName, userCode);

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

        public static User Create(string fullName, string userName, string? email, string? phoneNumber, string userCode, UserRole role, Restaurant restaurant)
        {
            ValidateCommon(fullName, userName, userCode);

            return new User
            {
                FullName = fullName,
                UserName = userName,
                Email = email,
                PhoneNumber = phoneNumber,
                UserCode = userCode,
                Role = role,
                Restaurant = restaurant
            };
        }
        public void Update(string fullName, string userName, string? email, string? phoneNumber, string userCode, UserRole role, bool isActive)
        {
            ValidateCommon(fullName, userName, userCode);

            FullName = fullName;
            UserName = userName;
            Email = email;
            PhoneNumber = phoneNumber;
            UserCode = userCode;
            Role = role;
            IsActive = isActive;
        }
        private static void ValidateCommon(string fullName, string userName, string userCode)
        {
            if (string.IsNullOrWhiteSpace(fullName))
                throw new DomainException("Ad soyad boş bırakılamaz.");

            if (string.IsNullOrWhiteSpace(userName))
                throw new DomainException("Kullanıcı adı boş bırakılamaz.");

            if (string.IsNullOrWhiteSpace(userCode))
                throw new DomainException("Kullanıcı kodu boş bırakılamaz.");
        }
        
        public void SetPasswordHash(string passwordHash)
        {
            PasswordHash = passwordHash;
        }
    }
}
