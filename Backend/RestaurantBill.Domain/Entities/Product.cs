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
        // Restoran sitesinde ürün adının altında görünen kısa açıklama ("Çift shot, günün çekirdeği").
        public string Description { get; private set; } = string.Empty;
        // Sitenin ana sayfasındaki "Ustanın seçtikleri" bölümünde gösterilir.
        public bool IsFeatured { get; private set; }
        // Tahmini hazırlanma süresi (dakika). null: süre takibi yok; mutfakta geri sayım ve
        // gecikme uyarısı yalnızca süresi olan ürünler için çalışır.
        public int? PrepMinutes { get; private set; }
        // Ürüne özel KDV oranı. null: kategorinin (o da yoksa şubenin) oranı kullanılır.
        public decimal? TaxRate { get; private set; }

        public const int DescriptionMaxLength = 160;
        public const int PrepMinutesMax = 240;

        protected Product() { }

        /// <summary>Yalnızca verilen alanları değiştirir; null olan alan olduğu gibi kalır.</summary>
        public void UpdateSiteDetails(string? description, bool? isFeatured)
        {
            if (description is not null)
            {
                string trimmed = description.Trim();
                if (trimmed.Length > DescriptionMaxLength)
                    throw new DomainException($"Ürün açıklaması en fazla {DescriptionMaxLength} karakter olabilir.");
                Description = trimmed;
            }

            if (isFeatured is not null)
                IsFeatured = isFeatured.Value;
        }

        public void SetPrepMinutes(int? prepMinutes)
        {
            if (prepMinutes is not null && (prepMinutes < 1 || prepMinutes > PrepMinutesMax))
                throw new DomainException($"Hazırlanma süresi 1 ile {PrepMinutesMax} dakika arasında olmalıdır.");

            PrepMinutes = prepMinutes;
        }

        public void SetTaxRate(decimal? taxRate)
        {
            if (taxRate is not null && (taxRate < 0 || taxRate > 100))
                throw new DomainException("KDV oranı 0 ile 100 arasında olmalıdır.");

            TaxRate = taxRate;
        }

        /// <summary>
        /// Siparişe yazılacak KDV: ürünün kendi oranı, yoksa kategorinin, o da yoksa şubenin oranı.
        /// Category (ve Category.Branch) yüklü değilse eski davranıştaki gibi 0 döner.
        /// </summary>
        public decimal GetEffectiveTaxRate()
        {
            return TaxRate ?? Category?.TaxRate ?? Category?.Branch?.TaxRate ?? 0m;
        }

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

        public void UpdateImage(string imageUrl)
        {
            if (string.IsNullOrWhiteSpace(imageUrl))
                throw new DomainException("Geçersiz görsel anahtarı.");

            ImageUrl = imageUrl;
        }
    }
}
