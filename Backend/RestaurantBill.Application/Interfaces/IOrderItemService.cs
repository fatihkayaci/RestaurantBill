using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface IOrderItemService
{
    Task CreateAsync(CreateOrderItemDto dto);
    Task<List<OrderItemDto>> GetAllAsync();
    Task UpdateAsync(UpdateOrderItemDto dto);
    Task<OrderItemDto> GetByIdAsync(int id);
    Task DeleteAsync(int id);
}
