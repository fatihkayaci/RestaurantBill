using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Infrastructure.Context;

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
    private ICategoryRepository? _categoryRepository;
    private ITableRepository? _tableRepository;
    private IOrderItemRepository? _orderItemRepository;
    private IRestaurantRepository? _restaurantRepository;
    private IUserRepository? _userRepository;


    public IProductRepository Products => _productRepository ??= new ProductRepository(_context);
    public IOrderRepository Orders => _orderRepository ??= new OrderRepository(_context);
    public ICategoryRepository Category => _categoryRepository ??= new CategoryRepository(_context);
    public ITableRepository Tables => _tableRepository ??= new TableRepository(_context);
    public IOrderItemRepository OrderItem => _orderItemRepository ??= new OrderItemRepository(_context);
    public IRestaurantRepository Restaurant => _restaurantRepository ??= new RestaurantRepository(_context);
    public IUserRepository User => _userRepository ??= new UserRepository(_context);


    public async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}