using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeUnitOfWork : IUnitOfWork
{
    public FakeProductRepository ProductRepo { get; } = new();
    public FakeOrderRepository OrderRepo { get; } = new();
    public FakeOrderItemRepository OrderItemRepo { get; } = new();
    public FakeCategoryRepository CategoryRepo { get; } = new();
    public FakeTableRepository TableRepo { get; } = new();
    public FakeRegionRepository RegionRepo { get; } = new();
    public FakeCompanyRepository CompanyRepo { get; } = new();
    public FakeRestaurantRepository RestaurantRepo { get; } = new();
    public FakeMembershipRepository MembershipRepo { get; } = new();
    public FakeUserRepository UserRepo { get; } = new();
    public FakeUserRestaurantRepository UserRestaurantRepo { get; } = new();
    public FakeVerificationCodeRepository VerificationCodeRepo { get; } = new();
    public FakeCashRegisterRepository CashRegisterRepo { get; } = new();
    public FakeCashTransactionRepository CashTransactionRepo { get; } = new();
    public FakeReservationRepository ReservationRepo { get; } = new();
    public FakeAuditLogRepository AuditLogRepo { get; } = new();
    public FakePaymentRepository PaymentRepo { get; } = new();

    public bool SaveChangesCalled { get; private set; }

    IProductRepository IUnitOfWork.Product => ProductRepo;
    IOrderRepository IUnitOfWork.Order => OrderRepo;
    IOrderItemRepository IUnitOfWork.OrderItem => OrderItemRepo;
    ICategoryRepository IUnitOfWork.Category => CategoryRepo;
    ITableRepository IUnitOfWork.Table => TableRepo;
    IRegionRepository IUnitOfWork.Region => RegionRepo;
    ICompanyRepository IUnitOfWork.Company => CompanyRepo;
    IBranchRepository IUnitOfWork.Branch => RestaurantRepo;
    IMembershipRepository IUnitOfWork.Membership => MembershipRepo;
    IUserRepository IUnitOfWork.User => UserRepo;
    IUserBranchRepository IUnitOfWork.UserBranch => UserRestaurantRepo;
    IVerificationCodeRepository IUnitOfWork.VerificationCode => VerificationCodeRepo;
    ICashRegisterRepository IUnitOfWork.CashRegister => CashRegisterRepo;
    ICashTransactionRepository IUnitOfWork.CashTransaction => CashTransactionRepo;
    IReservationRepository IUnitOfWork.Reservation => ReservationRepo;
    IAuditLogRepository IUnitOfWork.AuditLog => AuditLogRepo;
    IPaymentRepository IUnitOfWork.Payment => PaymentRepo;

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        SaveChangesCalled = true;
        return Task.FromResult(1);
    }

    public void Dispose() { }
}
