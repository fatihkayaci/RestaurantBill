using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Categories.Queries.GetAllCategories
{
    public class GetAllCategoryQuery : IRequest<List<CategoryDto>> 
    {
    }
}