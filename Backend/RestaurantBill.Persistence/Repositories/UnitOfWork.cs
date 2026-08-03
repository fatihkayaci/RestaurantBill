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
    private ICompanyRepository? _companyRepository;
    private IBranchRepository? _branchRepository;
    private IMembershipRepository? _membershipRepository;
    private IUserRepository? _userRepository;
    private IUserBranchRepository? _userBranchRepository;
    private IVerificationCodeRepository? _verificationCodeRepository;
    private ICashRegisterRepository? _cashRegisterRepository;
    private ICashTransactionRepository? _cashTransactionRepository;
    private IReservationRepository? _reservationRepository;
    private IAuditLogRepository? _auditLogRepository;


    public IProductRepository Product => _productRepository ??= new ProductRepository(_context);
    public IOrderRepository Order => _orderRepository ??= new OrderRepository(_context);
    public IOrderItemRepository OrderItem => _orderItemRepository ??= new OrderItemRepository(_context);
    public ICategoryRepository Category => _categoryRepository ??= new CategoryRepository(_context);
    public ITableRepository Table => _tableRepository ??= new TableRepository(_context);
    public IRegionRepository Region => _regionRepository ??= new RegionRepository(_context);
    public ICompanyRepository Company => _companyRepository ??= new CompanyRepository(_context);
    public IBranchRepository Branch => _branchRepository ??= new BranchRepository(_context);
    public IMembershipRepository Membership => _membershipRepository ??= new MembershipRepository(_context);
    public IUserRepository User => _userRepository ??= new UserRepository(_context);
    public IUserBranchRepository UserBranch => _userBranchRepository ??= new UserBranchRepository(_context);
    public IVerificationCodeRepository VerificationCode => _verificationCodeRepository ??= new VerificationCodeRepository(_context);
    public ICashRegisterRepository CashRegister => _cashRegisterRepository ??= new CashRegisterRepository(_context);
    public ICashTransactionRepository CashTransaction => _cashTransactionRepository ??= new CashTransactionRepository(_context);
    public IReservationRepository Reservation => _reservationRepository ??= new ReservationRepository(_context);
    public IAuditLogRepository AuditLog => _auditLogRepository ??= new AuditLogRepository(_context);


    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}