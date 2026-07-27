using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class Restaurant : BaseEntity
    {
        public string Name { get; private set; } = string.Empty;
        public string PhoneNumber { get; private set; } = string.Empty;
        public string Email { get; private set; } = string.Empty;
        public string City { get; private set; } = string.Empty;
        public string District { get; private set; } = string.Empty;
        public string Slug { get; private set; } = string.Empty;
        public int OwnerUserId { get; private set; }
        public User OwnerUser { get; private set; } = default!;

        protected Restaurant() { }

        public static Restaurant Create(string name, User owner)
        {
            if (owner == null)
                throw new DomainException("Geçersiz kullanıcı.");

            return new Restaurant { Name = name, OwnerUser = owner };
        }

        public void Update(string name, string phoneNumber, string email, string city, string district)
        {
            Name = name;
            PhoneNumber = phoneNumber;
            Email = email;
            City = city;
            District = district;
        }

        public void AssignSlug(string slug)
        {
            Slug = slug;
        }
    }
}
