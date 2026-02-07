using RestaurantBill.Core.DTOs;
namespace RestaurantBill.Core.Interfaces;

public interface ICategoryService
{
    Task AddAsync(CreateCategoryDto dto); 
    Task<List<ResponseCategoryDto>> GetAllAsync();
}