using RestaurantBill.Core.DTOs;
namespace RestaurantBill.Core.Interfaces;

public interface IUserService
{
    Task AddAsync(CreateUserDto dto); 
    Task<List<UserResponse>> GetAllAsync();
}