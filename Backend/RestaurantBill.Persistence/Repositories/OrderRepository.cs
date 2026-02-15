using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Infrastructure.Context;

namespace RestaurantBill.Persistence.Repositories;
public class OrderRepository : GenericRepository<Order>, IOrderRepository
{
    public OrderRepository(RestaurantBillDbContext context) : base(context)
    {
    }
    public async Task<Order?> GetActiveOrderByTableId(int tableId)
    {
        return null;
    }

    public async Task<Order?> GetOrderWithDetailsAsync(int id)
    {
        return null;
    }
}