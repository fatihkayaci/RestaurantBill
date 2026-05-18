using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class Product : BaseEntity
    {
        public string Name { get; private set; } = string.Empty;
        public decimal Price { get; private set; }
        public bool IsActive { get; private set; }
        public string ImageUrl { get; private set; } = string.Empty;
        public int RestaurantId { get; private set; }
        public int CategoryId { get; private set; }
        public Category Category { get; private set; } = default!;

        protected Product() { }

        public static Product Create(string name, decimal price, bool isActive, string imageUrl, int categoryId, int restaurantId)
        {
            if (restaurantId <= 0)
                throw new DomainException("Geçersiz restoran ID'si.");

            return new Product
            {
                Name = name,
                Price = price,
                IsActive = isActive,
                ImageUrl = imageUrl,
                CategoryId = categoryId,
                RestaurantId = restaurantId
            };
        }

        public void Update(string name, decimal price, bool isActive, int categoryId)
        {
            Name = name;
            Price = price;
            IsActive = isActive;
            CategoryId = categoryId;
        }
    }
}
