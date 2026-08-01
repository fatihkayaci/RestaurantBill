using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.DeleteProduct
{
    public class DeleteProductCommand : IRequest<Result>, IInvalidatesCache
    {
        public Guid Id { get; set; }

        public string[] CacheKeysToInvalidate => ["products:all"];
    }
}