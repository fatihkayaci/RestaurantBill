using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Services;

public class RestaurantService : IRestaurantService
{

    public Task CreateAsync(CreateRestaurantDto dto)
    {
        throw new NotImplementedException();
    }

    public Task DeleteAsync(int id)
    {
        throw new NotImplementedException();
    }

    public Task<List<RestaurantDto>> GetAllAsync()
    {
        throw new NotImplementedException();
    }

    public Task<RestaurantDto> GetByIdAsync(int id)
    {
        throw new NotImplementedException();
    }

    public Task UpdateAsync(UpdateRestaurantDto dto)
    {
        throw new NotImplementedException();
    }
}