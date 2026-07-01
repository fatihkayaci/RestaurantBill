using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Persistence.Context;
using RestaurantBill.Persistence.Repositories;

namespace RestaurantBill.Integration.Tests.Infrastructure;

public abstract class IntegrationTestBase : IDisposable
{
    protected readonly RestaurantBillDbContext DbContext;
    protected readonly IUnitOfWork UnitOfWork;
    protected readonly ICurrentUserService CurrentUser;

    protected const int RestaurantId = 1;
    protected const int OtherRestaurantId = 2;
    protected const int UserId = 1;

    protected IntegrationTestBase()
    {
        var options = new DbContextOptionsBuilder<RestaurantBillDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        DbContext = new RestaurantBillDbContext(options);
        UnitOfWork = new UnitOfWork(DbContext);
        CurrentUser = new FakeCurrentUserService { RestaurantId = RestaurantId, UserId = UserId };
    }

    public void Dispose() => DbContext.Dispose();
}
