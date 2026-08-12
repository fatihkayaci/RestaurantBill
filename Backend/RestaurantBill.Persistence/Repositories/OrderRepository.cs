using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Persistence.Context;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Persistence.Repositories;
public class OrderRepository : GenericRepository<Order>, IOrderRepository
{
    public OrderRepository(RestaurantBillDbContext context) : base(context)
    {
    }

    public async Task CreateMultiplierOrderItems(Guid tableId, OrderItem[] items)
    {
        IQueryable<Order> query = _context.Set<Order>();
    }

    public async Task<Order?> GetActiveOrderByTableId(Guid tableId, bool trackChanges = false)
    {
        IQueryable<Order> query = _context.Set<Order>();

        if (!trackChanges) 
            query = query.AsNoTracking();
 
        return await query
            .Include(o => o.OrderItems)
            .ThenInclude(i => i.Product)
            .ThenInclude(p => p.Category)
            .OrderByDescending(o => o.Id)
            .FirstOrDefaultAsync(o => o.TableId == tableId &&
                (o.Status == OrderStatus.Active ||
                 o.Status == OrderStatus.Pending ||
                 o.Status == OrderStatus.Preparing ||
                 o.Status == OrderStatus.Ready ||
                 o.Status == OrderStatus.Served));
    }
}