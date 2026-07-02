using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeUnitOfWork : IUnitOfWork
{
    public FakeProductRepository ProductRepo { get; } = new();
    public FakeOrderRepository OrderRepo { get; } = new();
    public FakeCategoryRepository CategoryRepo { get; } = new();
    public FakeTableRepository TableRepo { get; } = new();
    public FakeRestaurantRepository RestaurantRepo { get; } = new();
    public FakeMembershipRepository MembershipRepo { get; } = new();
    public FakeUserRepository UserRepo { get; } = new();
    public FakeCashRegisterRepository CashRegisterRepo { get; } = new();
    public FakeCashTransactionRepository CashTransactionRepo { get; } = new();

    public bool SaveChangesCalled { get; private set; }

    IProductRepository IUnitOfWork.Product => ProductRepo;
    IOrderRepository IUnitOfWork.Order => OrderRepo;
    ICategoryRepository IUnitOfWork.Category => CategoryRepo;
    ITableRepository IUnitOfWork.Table => TableRepo;
    IRestaurantRepository IUnitOfWork.Restaurant => RestaurantRepo;
    IMembershipRepository IUnitOfWork.Membership => MembershipRepo;
    IUserRepository IUnitOfWork.User => UserRepo;
    ICashRegisterRepository IUnitOfWork.CashRegister => CashRegisterRepo;
    ICashTransactionRepository IUnitOfWork.CashTransaction => CashTransactionRepo;

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        SaveChangesCalled = true;
        return Task.FromResult(1);
    }

    public void Dispose() { }
}
