namespace RestaurantBill.Domain.Interfaces;

using RestaurantBill.Domain.Entities;

public interface IOrderRepository : IGenericRepository<Order>
{
    Task<Order?> GetActiveOrderByTableId(int tableId, bool trackChanges = false);
    Task CreateMultiplierOrderItems(int tableId, OrderItem[] items);
}