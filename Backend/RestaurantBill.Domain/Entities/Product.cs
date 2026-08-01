using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class Product : BaseEntity
    {
        public Guid CategoryId { get; private set; }
        public Category Category { get; private set; } = default!;
        public string Name { get; private set; } = string.Empty;
        public decimal Price { get; private set; }
        public bool IsActive { get; private set; }
        public string ImageUrl { get; private set; } = string.Empty;

        protected Product() { }

        public static Product Create(string name, decimal price, string imageUrl, Guid categoryId)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Ürün adı boş olamaz.");

            if (price <= 0)
                throw new DomainException("Fiyat 0'dan büyük olmalıdır.");

            if (categoryId == Guid.Empty)
                throw new DomainException("Geçersiz kategori ID'si.");

            return new Product
            {
                Name = name,
                Price = price,
                IsActive = true,
                ImageUrl = imageUrl,
                CategoryId = categoryId
            };
        }

        public void EnsureCanBeDeleted(IEnumerable<OrderItem> linkedOrderItems)
        {
            if (linkedOrderItems.Any())
                throw new DomainException("Bu ürüne ait sipariş kayıtları bulunmaktadır. Bu ürün silinemez, bunun yerine pasif hale getirebilirsiniz.");
        }

        public void Update(string name, decimal price, bool isActive, Guid categoryId)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Ürün adı boş olamaz.");

            if (price <= 0)
                throw new DomainException("Fiyat 0'dan büyük olmalıdır.");

            if (categoryId == Guid.Empty)
                throw new DomainException("Geçersiz kategori ID'si.");

            Name = name;
            Price = price;
            IsActive = isActive;
            CategoryId = categoryId;
        }
    }
}
