namespace RestaurantBill.Domain.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IProductRepository Product { get; }
    IOrderRepository Order { get; }
    IOrderItemRepository OrderItem { get; }
    ICategoryRepository Category { get; }
    ITableRepository Table { get; }
    IRegionRepository Region { get; }
    ICompanyRepository Company { get; }
    IBranchRepository Branch { get; }
    IMembershipRepository Membership { get; }
    IUserRepository User { get; }
    IUserBranchRepository UserBranch { get; }
    IVerificationCodeRepository VerificationCode { get; }
    ICashRegisterRepository CashRegister { get; }
    ICashTransactionRepository CashTransaction { get; }
    IReservationRepository Reservation { get; }
    IAuditLogRepository AuditLog { get; }
    IPaymentRepository Payment { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}