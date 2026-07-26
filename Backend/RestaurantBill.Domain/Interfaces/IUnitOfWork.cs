namespace RestaurantBill.Domain.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IProductRepository Product { get; }
    IOrderRepository Order { get; }
    IOrderItemRepository OrderItem { get; }
    ICategoryRepository Category { get; }
    ITableRepository Table { get; }
    IRegionRepository Region { get; }
    IRestaurantRepository Restaurant { get; }
    IMembershipRepository Membership { get; }
    IUserRepository User { get; }
    IUserRestaurantRepository UserRestaurant { get; }
    ICashRegisterRepository CashRegister { get; }
    ICashTransactionRepository CashTransaction { get; }
    IReservationRepository Reservation { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}