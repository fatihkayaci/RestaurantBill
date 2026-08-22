using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Orders.Queries;

public class OrderQueries(IAppDbContext db)
{
    public Task<Order?> GetActiveOrderByTableIdAsync(Guid tableId, bool trackChanges, CancellationToken cancellationToken)
    {
        IQueryable<Order> query = db.Orders;
        if (!trackChanges)
            query = query.AsNoTracking();

        return query
            .Include(o => o.OrderItems)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.Category)
            .OrderByDescending(o => o.Id)
            .FirstOrDefaultAsync(o => o.TableId == tableId &&
                (o.Status == OrderStatus.Active ||
                 o.Status == OrderStatus.Pending ||
                 o.Status == OrderStatus.Preparing ||
                 o.Status == OrderStatus.Ready ||
                 o.Status == OrderStatus.Served),
                cancellationToken);
    }
}
