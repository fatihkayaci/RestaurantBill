using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface IUserService
{
    Task AddAsync(CreateUserDto dto); 
    Task<List<UserResponse>> GetAllAsync();
}