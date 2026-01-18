using RestaurantBill.Core;

namespace RestaurantBill.Core.Interfaces;
public interface IOrderRepository : IGenericRepository<Order>
{
    Task<Order?> GetOrderWithDetailsAsync(int id);
}