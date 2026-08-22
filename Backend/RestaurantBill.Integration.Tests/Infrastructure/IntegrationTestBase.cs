using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Integration.Tests.Infrastructure;

public abstract class IntegrationTestBase : IDisposable
{
    protected readonly RestaurantBillDbContext DbContext;
    protected readonly IAppDbContext AppDb;
    protected readonly ICurrentUserService CurrentUser;

    protected static readonly Guid RestaurantId = Guid.NewGuid();
    protected static readonly Guid OtherRestaurantId = Guid.NewGuid();
    protected static readonly Guid UserId = Guid.NewGuid();

    protected readonly Guid DefaultRegionId;
    protected readonly Guid OtherDefaultRegionId;

    protected IntegrationTestBase()
    {
        var options = new DbContextOptionsBuilder<RestaurantBillDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        CurrentUser = new FakeCurrentUserService { BranchId = RestaurantId, UserId = UserId };
        DbContext = new RestaurantBillDbContext(options, CurrentUser);
        AppDb = DbContext;

        Branch branch = Branch.Create("Ana Şube");
        Branch otherBranch = Branch.Create("Diğer Şube");
        DbContext.Branches.AddRange(branch, otherBranch);
        DbContext.Entry(branch).Property(b => b.Id).CurrentValue = RestaurantId;
        DbContext.Entry(otherBranch).Property(b => b.Id).CurrentValue = OtherRestaurantId;
        DbContext.SaveChanges();

        Region defaultRegion = Region.Create("Genel", RestaurantId);
        Region otherDefaultRegion = Region.Create("Genel", OtherRestaurantId);
        DbContext.Regions.AddRange(defaultRegion, otherDefaultRegion);
        DbContext.SaveChanges();
        DefaultRegionId = defaultRegion.Id;
        OtherDefaultRegionId = otherDefaultRegion.Id;
    }

    public void Dispose() => DbContext.Dispose();
}
