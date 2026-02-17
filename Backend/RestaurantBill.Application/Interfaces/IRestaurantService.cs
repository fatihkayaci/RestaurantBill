using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface IRestaurantService
{
    Task AddAsync(CreateRestaurantDto dto); 
    Task<List<RestaurantDto>> GetAllAsync();
}
