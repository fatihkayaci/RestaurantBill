using RestaurantBill.Core.DTOs;
namespace RestaurantBill.Core.Interfaces;

public interface IOrderService
{
    Task AddAsync(CreateOrderDto dto); 
    Task<List<OrderResponse>> GetAllAsync();
}
