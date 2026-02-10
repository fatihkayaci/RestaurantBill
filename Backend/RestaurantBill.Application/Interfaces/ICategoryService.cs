using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface ICategoryService
{
    Task AddAsync(CreateCategoryDto dto); 
    Task<List<ResponseCategoryDto>> GetAllAsync();
}