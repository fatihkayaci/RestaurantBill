using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Products.Commands.CreateProduct
{
    public class CreateProductCommand : IRequest, IInvalidatesCache, IIdempotent
    {
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public bool IsActive { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public string IdempotencyKey => $"create-product:{Name}:{CategoryId}";

        public string[] CacheKeysToInvalidate => ["products:all"];
    }
}