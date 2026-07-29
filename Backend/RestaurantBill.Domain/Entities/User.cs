using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class User : BaseEntity
    {
        public string FullName { get; private set; } = string.Empty;
        public string? Email { get; private set; }
        public string? PhoneNumber { get; private set; }
        public string PasswordHash { get; private set; } = string.Empty;
        public bool IsActive { get; private set; } = true;

        protected User() { }

        public static User Create(string fullName, string? email, string? phoneNumber)
        {
            ValidateCommon(fullName);

            return new User
            {
                FullName = fullName,
                Email = email,
                PhoneNumber = phoneNumber
            };
        }

        public void Update(string fullName, string? email, string? phoneNumber, bool isActive)
        {
            ValidateCommon(fullName);

            FullName = fullName;
            Email = email;
            PhoneNumber = phoneNumber;
            IsActive = isActive;
        }
        private static void ValidateCommon(string fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName))
                throw new DomainException("Ad soyad boş bırakılamaz.");
        }

        public void SetPasswordHash(string passwordHash)
        {
            PasswordHash = passwordHash;
        }
    }
}
