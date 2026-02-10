namespace RestaurantBill.Application.Interfaces;

using RestaurantBill.Domain;

public interface IOrderRepository : IGenericRepository<Order>
{
    Task<Order?> GetOrderWithDetailsAsync(int id);
    Task<Order?> GetActiveOrderByTableId(int id);
}