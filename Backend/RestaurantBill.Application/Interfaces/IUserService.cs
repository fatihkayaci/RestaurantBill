using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface IUserService
{
    Task CreateAsync(CreateUserDto dto); 
    Task<List<UserDto>> GetAllAsync();    
    Task UpdateAsync(UpdateUserDto dto);
    Task<UserDto> GetByIdAsync(int id);
    Task DeleteAsync(int id);
}