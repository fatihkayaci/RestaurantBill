using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class UserRestaurant : BaseEntity
    {
        public int UserId { get; private set; }
        public User User { get; private set; } = default!;
        public int RestaurantId { get; private set; }
        public Restaurant Restaurant { get; private set; } = default!;
        public string UserName { get; private set; } = string.Empty;
        public string UserCode { get; private set; } = string.Empty;
        public UserRole Role { get; private set; }
        public bool IsActive { get; private set; } = true;

        protected UserRestaurant() { }

        public static UserRestaurant Create(User user, Restaurant restaurant, string userName, string userCode, UserRole role)
        {
            if (user == null)
                throw new DomainException("Geçersiz kullanıcı.");

            if (restaurant == null)
                throw new DomainException("Geçersiz restoran.");

            if (string.IsNullOrWhiteSpace(userName))
                throw new DomainException("Kullanıcı adı boş bırakılamaz.");

            if (string.IsNullOrWhiteSpace(userCode))
                throw new DomainException("Kullanıcı kodu boş bırakılamaz.");

            return new UserRestaurant
            {
                User = user,
                Restaurant = restaurant,
                UserName = userName,
                UserCode = userCode,
                Role = role
            };
        }

        public void Update(string userName, string userCode, UserRole role)
        {
            if (string.IsNullOrWhiteSpace(userName))
                throw new DomainException("Kullanıcı adı boş bırakılamaz.");

            if (string.IsNullOrWhiteSpace(userCode))
                throw new DomainException("Kullanıcı kodu boş bırakılamaz.");

            UserName = userName;
            UserCode = userCode;
            Role = role;
        }

        public void ChangeRestaurant(Restaurant restaurant)
        {
            if (restaurant == null)
                throw new DomainException("Geçersiz restoran.");

            Restaurant = restaurant;
            RestaurantId = restaurant.Id;
        }
    }
}
