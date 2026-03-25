using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface IRestaurantService
{
    Task CreateAsync(CreateRestaurantDto dto, CancellationToken cancellationToken); 
    Task<List<RestaurantDto>> GetAllAsync();
    Task UpdateAsync(UpdateRestaurantDto dto, CancellationToken cancellationToken);
    Task<RestaurantDto> GetByIdAsync(int id);
    Task DeleteAsync(int id, CancellationToken cancellationToken);
}
