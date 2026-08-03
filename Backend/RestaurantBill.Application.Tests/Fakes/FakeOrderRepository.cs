using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeOrderRepository : FakeGenericRepository<Order>, IOrderRepository
{
    public Task<Order?> GetActiveOrderByTableId(Guid tableId, bool trackChanges = false)
        => Task.FromResult(Data.FirstOrDefault(o => o.TableId == tableId));

    public Task CreateMultiplierOrderItems(Guid tableId, OrderItem[] items) => Task.CompletedTask;
}
