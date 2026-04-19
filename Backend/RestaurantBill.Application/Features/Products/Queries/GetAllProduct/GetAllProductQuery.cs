using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Products.Queries.GetAllProduct
{
    public class GetAllProductQuery : IRequest<List<ProductDto>>, ICacheable
    {
        public string CacheKey => "products:all";
        public TimeSpan Ttl => TimeSpan.FromSeconds(60);
    }
}