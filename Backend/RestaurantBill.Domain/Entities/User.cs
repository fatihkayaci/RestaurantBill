using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class User : BaseEntity
    {
        public string FullName { get; private set; } = string.Empty;
        public string Email { get; private set; }= string.Empty;
        public string PhoneNumber { get; private set; }= string.Empty;
        public string PasswordHash { get; private set; } = string.Empty;
        public bool IsActive { get; private set; } = true;
        public bool IsPhoneVerified { get; private set; } = false;
        public bool IsEmailVerified { get; private set; } = false;

        protected User() { }

        public static User Create(string fullName, string email, string phoneNumber)
        {
            if (string.IsNullOrWhiteSpace(fullName))
                throw new DomainException("Ad soyad boş bırakılamaz.");

            return new User
            {
                FullName = fullName,
                Email = email,
                PhoneNumber = phoneNumber
            };
        }

        public void Update(string fullName, string email, string phoneNumber, bool isActive)
        {
            if (string.IsNullOrWhiteSpace(fullName))
                throw new DomainException("Ad soyad boş bırakılamaz.");

            FullName = fullName;
            Email = email;
            PhoneNumber = phoneNumber;
            IsActive = isActive;
        }

        public void SetPasswordHash(string passwordHash)
        {
            PasswordHash = passwordHash;
        }

        public void MarkPhoneVerified()
        {
            IsPhoneVerified = true;
        }

        public void MarkEmailVerified()
        {
            IsEmailVerified = true;
        }
    }
}
