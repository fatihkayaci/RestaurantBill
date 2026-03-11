using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Persistence.Repositories;
public class OrderRepository : GenericRepository<Order>, IOrderRepository
{
    public OrderRepository(RestaurantBillDbContext context) : base(context)
    {
    }
    public async Task<Order?> GetActiveOrderByTableId(int tableId, bool trackChanges = false)
    {
        IQueryable<Order> query = _context.Set<Order>();

        if (!trackChanges) 
            query = query.AsNoTracking();

        return await query
            .Include(o => o.OrderItems)
            .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(o => o.TableId == tableId);
    }
}