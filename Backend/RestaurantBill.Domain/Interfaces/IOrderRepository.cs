namespace RestaurantBill.Domain.Interfaces;

using RestaurantBill.Domain.Entities;

public interface IOrderRepository : IGenericRepository<Order>
{
    Task<Order?> GetOrderWithDetailsAsync(int id);
    Task<Order?> GetActiveOrderByTableId(int id);
}