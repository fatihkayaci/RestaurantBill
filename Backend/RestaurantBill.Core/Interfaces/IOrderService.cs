using RestaurantBill.Core.DTOs;
namespace RestaurantBill.Core.Interfaces;

public interface IOrderService
{
    Task AddAsync(CreateOrderDto dto); 
    Task <List<OrderResponse>> GetAllAsync();
    Task <OrderResponse> GetOrderDetailsAsync(int id);
    Task DeleteOrderDetailAsync(int id);
    Task CloseOrderAsync(int id);
    Task<OrderResponse> GetActiveOrderByTableIdAsync(int tableId);
}
