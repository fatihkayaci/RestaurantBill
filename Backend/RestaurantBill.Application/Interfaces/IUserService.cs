using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface IUserService
{
    Task CreateAsync(CreateUserDto dto); 
    Task<List<UserDto>> GetAllAsync();
}