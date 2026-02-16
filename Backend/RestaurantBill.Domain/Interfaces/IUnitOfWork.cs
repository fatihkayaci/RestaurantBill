namespace RestaurantBill.Domain.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IProductRepository Products { get; }
    IOrderRepository Orders { get; }
    ICategoryRepository Category { get; }
    ITableRepository Tables { get; }
    IOrderItemRepository OrderItem { get; }
    IRestaurantRepository Restaurant { get; }
    IUserRepository User { get; }
    Task<int> SaveChangesAsync();
}