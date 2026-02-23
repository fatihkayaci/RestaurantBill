using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Interfaces;

public interface IOrderService
{
    Task CreateAsync(CreateOrderDto dto);
    Task <List<OrderDto>> GetAllAsync();
    Task<OrderDto> GetByIdAsync(int id);

    Task MoveOrderToTableAsync(int orderId, int newTableId);
    Task UpdateOrderStatusAsync(int orderId, OrderStatus newStatus);
    Task CloseOrderAsync(int orderId);
    Task CancelOrderAsync(int orderId);
    Task AddProductToOrderAsync(int orderId, CreateOrderItemDto dto);
    Task RemoveProductFromOrderAsync(int orderId, RemoveOrderItemDto dto);
}
