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
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Ürün adı boş olamaz.");

            if (price <= 0)
                throw new DomainException("Fiyat 0'dan büyük olmalıdır.");

            if (categoryId <= 0)
                throw new DomainException("Geçersiz kategori ID'si.");

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
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Ürün adı boş olamaz.");

            if (price <= 0)
                throw new DomainException("Fiyat 0'dan büyük olmalıdır.");

            if (categoryId <= 0)
                throw new DomainException("Geçersiz kategori ID'si.");

            Name = name;
            Price = price;
            IsActive = isActive;
            CategoryId = categoryId;
        }
    }
}
