using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.CreateProduct
{
    public class CreateProductCommand : IRequest<Result>, IInvalidatesCache, IIdempotent
    {
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        /// <summary>Birim maliyet (₺). Gönderilmezse 0.</summary>
        public decimal Cost { get; set; }
        public bool IsActive { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public Guid CategoryId { get; set; }
        public string? Description { get; set; }
        public bool? IsFeatured { get; set; }
        /// <summary>"Yeni" etiketi (30 gün sürer). null: değiştirme.</summary>
        public bool? IsNew { get; set; }
        /// <summary>Hazırlanma süresi (dk). null: süre takibi yok. Her istekte tam değer gönderilir.</summary>
        public int? PrepMinutes { get; set; }
        /// <summary>Ürüne özel KDV. null: kategorinin oranı kullanılır. Her istekte tam değer gönderilir.</summary>
        public decimal? TaxRate { get; set; }
        /// <summary>Alerjen bayrakları (ProductAllergen; sabit liste). null: yok (0).</summary>
        public int? Allergens { get; set; }
        /// <summary>Diyet / bilgi etiketleri (ProductDietTag: vegan, vejetaryen, glutensiz, helal, acılı). null: yok (0).</summary>
        public int? DietTags { get; set; }
        public string IdempotencyKey => $"create-product:{Name}:{CategoryId}";

        public string[] CacheKeysToInvalidate => ["products:all"];
    }
}