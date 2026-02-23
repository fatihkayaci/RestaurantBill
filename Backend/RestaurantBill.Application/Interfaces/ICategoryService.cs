using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface ICategoryService
{
    Task CreateAsync(CreateCategoryDto dto);
    Task<List<CategoryDto>> GetAllAsync();
    Task UpdateAsync(UpdateCategoryDto dto);
    Task<CategoryDto> GetByIdAsync(int id);
    Task DeleteAsync(int id);
}