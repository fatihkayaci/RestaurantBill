using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface IRestaurantService
{
    Task CreateAsync(CreateRestaurantDto dto); 
    Task<List<RestaurantDto>> GetAllAsync();
    Task UpdateAsync(UpdateRestaurantDto dto);
    Task<RestaurantDto> GetByIdAsync(int id);
    Task DeleteAsync(int id);
}
