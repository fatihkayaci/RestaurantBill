using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Queries.GetAllProduct
{
    public class GetAllProductQuery : IRequest<Result<List<ProductDto>>>, ICacheable
    {
        public string CacheKey => "products:all";
        public TimeSpan Ttl => TimeSpan.FromSeconds(60);
    }
}