using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Categories.Queries.GetAllCategories
{
    public class GetAllCategoryQuery : IRequest<List<CategoryDto>>, ICacheable
    {
        public string CacheKey => "categories:all";
        public TimeSpan Ttl => TimeSpan.FromSeconds(60);
    }
}