using RestaurantBill.Core.DTOs;
namespace RestaurantBill.Core.Interfaces;

public interface IOrderItemService
{
    Task AddAsync(CreateOrderItemDto dto); 
    Task<List<OrderItemResponse>> GetAllAsync();
}
