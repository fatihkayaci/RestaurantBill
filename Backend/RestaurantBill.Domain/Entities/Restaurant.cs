using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class Restaurant : BaseEntity
    {
        public string UserId { get; private set; } = string.Empty;
        public string Name { get; private set; } = string.Empty;
        public string PhoneNumber { get; private set; } = string.Empty;
        public string MobilePhoneNumber { get; private set; } = string.Empty;
        public string Email { get; private set; } = string.Empty;
        public string City { get; private set; } = string.Empty;
        public string District { get; private set; } = string.Empty;

        protected Restaurant() { }

        public static Restaurant Create(string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
                throw new DomainException("Kullanıcı ID'si boş olamaz.");

            return new Restaurant { UserId = userId };
        }

        public void Update(string name, string phoneNumber, string mobilePhoneNumber, string email, string city, string district)
        {
            Name = name;
            PhoneNumber = phoneNumber;
            MobilePhoneNumber = mobilePhoneNumber;
            Email = email;
            City = city;
            District = district;
        }
    }
}
