using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface IOrderService
{
    Task CreateAsync(CreateOrderDto dto); 
    Task <List<OrderDto>> GetAllAsync();
    Task <OrderDto> GetOrderDetailsAsync(int id);
    Task DeleteOrderDetailAsync(int id);
    Task CloseOrderAsync(int id);
    Task<OrderDto> GetActiveOrderByTableIdAsync(int tableId);
}
