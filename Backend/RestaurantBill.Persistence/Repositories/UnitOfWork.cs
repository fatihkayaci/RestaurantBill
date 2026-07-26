using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Persistence.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly RestaurantBillDbContext _context;
    public UnitOfWork(RestaurantBillDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }
    
    private IProductRepository? _productRepository;
    private IOrderRepository? _orderRepository;
    private IOrderItemRepository? _orderItemRepository;
    private ICategoryRepository? _categoryRepository;
    private ITableRepository? _tableRepository;
    private IRegionRepository? _regionRepository;
    private IRestaurantRepository? _restaurantRepository;
    private IMembershipRepository? _membershipRepository;
    private IUserRepository? _userRepository;
    private IUserRestaurantRepository? _userRestaurantRepository;
    private ICashRegisterRepository? _cashRegisterRepository;
    private ICashTransactionRepository? _cashTransactionRepository;
    private IReservationRepository? _reservationRepository;


    public IProductRepository Product => _productRepository ??= new ProductRepository(_context);
    public IOrderRepository Order => _orderRepository ??= new OrderRepository(_context);
    public IOrderItemRepository OrderItem => _orderItemRepository ??= new OrderItemRepository(_context);
    public ICategoryRepository Category => _categoryRepository ??= new CategoryRepository(_context);
    public ITableRepository Table => _tableRepository ??= new TableRepository(_context);
    public IRegionRepository Region => _regionRepository ??= new RegionRepository(_context);
    public IRestaurantRepository Restaurant => _restaurantRepository ??= new RestaurantRepository(_context);
    public IMembershipRepository Membership => _membershipRepository ??= new MembershipRepository(_context);
    public IUserRepository User => _userRepository ??= new UserRepository(_context);
    public IUserRestaurantRepository UserRestaurant => _userRestaurantRepository ??= new UserRestaurantRepository(_context);
    public ICashRegisterRepository CashRegister => _cashRegisterRepository ??= new CashRegisterRepository(_context);
    public ICashTransactionRepository CashTransaction => _cashTransactionRepository ??= new CashTransactionRepository(_context);
    public IReservationRepository Reservation => _reservationRepository ??= new ReservationRepository(_context);


    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}