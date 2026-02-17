using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface IRestaurantService
{
    Task CreateAsync(CreateRestaurantDto dto); 
    Task<List<RestaurantDto>> GetAllAsync();
}
