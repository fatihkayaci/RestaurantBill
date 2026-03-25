using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface ICategoryService
{
    Task CreateAsync(CreateCategoryDto dto, CancellationToken cancellationToken);
    Task<List<CategoryDto>> GetAllAsync();
    Task UpdateAsync(UpdateCategoryDto dto, CancellationToken cancellationToken);
    Task<CategoryDto> GetByIdAsync(int id);
    Task DeleteAsync(int id, CancellationToken cancellationToken);
}