using Microsoft.EntityFrameworkCore;
using RestaurantBill.Core;
using RestaurantBill.Core.Interfaces;
using RestaurantBill.Infrastructure.Context;

namespace RestaurantBill.Infrastructure.Repositories;
public class OrderRepository : GenericRepository<Order>, IOrderRepository
{
    private readonly RestaurantBillDbContext _context;

    public OrderRepository(RestaurantBillDbContext context) : base(context)
    {
        _context = context;
    }   

    public async Task<Order?> GetOrderWithDetailsAsync(int id)
    {
        return await _context.Orders
            .Include(x => x.OrderItems)
            .ThenInclude(y => y.Product)
            .FirstOrDefaultAsync(x => x.Id == id);
    }
}