using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Products.Commands.DeleteProduct
{
    public class DeleteProductCommand : IRequest, IInvalidatesCache
    {
        public int Id { get; set; }

        public string[] CacheKeysToInvalidate => ["products:all"];
    }
}