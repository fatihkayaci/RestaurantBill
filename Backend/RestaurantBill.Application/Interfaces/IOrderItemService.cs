using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface IOrderItemService
{
    Task AddAsync(CreateOrderItemDto dto); 
    Task<List<OrderItemDto>> GetAllAsync();
    Task DeleteAsync(int id);
}
