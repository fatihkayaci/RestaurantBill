using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Categories.Queries.GetAllCategories
{
    public class GetAllCategoryQuery : IRequest<Result<List<CategoryDto>>>, ICacheable
    {
        public string CacheKey => "categories:all";
        public TimeSpan Ttl => TimeSpan.FromSeconds(60);
    }
}