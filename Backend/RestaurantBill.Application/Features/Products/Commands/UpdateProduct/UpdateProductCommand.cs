using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Products.Commands.UpdateProduct
{
    public class UpdateProductCommand : IRequest, IInvalidatesCache
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public bool IsActive { get; set; }
        public int CategoryId { get; set; }

        public string[] CacheKeysToInvalidate => ["products:all"];
    }
}