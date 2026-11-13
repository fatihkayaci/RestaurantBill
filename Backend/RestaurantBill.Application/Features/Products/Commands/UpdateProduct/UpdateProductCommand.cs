using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.UpdateProduct
{
    public class UpdateProductCommand : IRequest<Result>, IInvalidatesCache
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public bool IsActive { get; set; }
        public Guid CategoryId { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        /// <summary>null: değiştirme.</summary>
        public string? Description { get; set; }
        /// <summary>null: değiştirme.</summary>
        public bool? IsFeatured { get; set; }
        /// <summary>Hazırlanma süresi (dk). null: süre takibi yok. Her istekte tam değer gönderilir.</summary>
        public int? PrepMinutes { get; set; }
        /// <summary>Ürüne özel KDV. null: kategorinin oranı kullanılır. Her istekte tam değer gönderilir.</summary>
        public decimal? TaxRate { get; set; }

        public string[] CacheKeysToInvalidate => ["products:all"];
    }
}