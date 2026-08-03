namespace RestaurantBill.Domain.Interfaces;

using RestaurantBill.Domain.Entities;

public interface IOrderRepository : IGenericRepository<Order>
{
    Task<Order?> GetActiveOrderByTableId(Guid tableId, bool trackChanges = false);
    Task CreateMultiplierOrderItems(Guid tableId, OrderItem[] items);
}