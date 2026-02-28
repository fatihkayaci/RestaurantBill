namespace RestaurantBill.Domain.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IProductRepository Product { get; }
    IOrderRepository Order { get; }
    ICategoryRepository Category { get; }
    ITableRepository Table { get; }
    IRestaurantRepository Restaurant { get; }
    IUserRepository User { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}