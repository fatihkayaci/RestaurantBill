using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface IUserService
{
    Task CreateAsync(CreateUserDto dto, CancellationToken cancellationToken); 
    Task<List<UserDto>> GetAllAsync();    
    Task UpdateAsync(UpdateUserDto dto, CancellationToken cancellationToken);
    Task<UserDto> GetByIdAsync(int id);
    Task DeleteAsync(int id, CancellationToken cancellationToken);
}