using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Application.Tests.Infrastructure;

public abstract class ApplicationTestBase : IDisposable
{
    protected readonly RestaurantBillDbContext DbContext;
    protected readonly IAppDbContext Db;
    protected readonly FakeCurrentUserService CurrentUser;

    protected ApplicationTestBase()
    {
        var options = new DbContextOptionsBuilder<RestaurantBillDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        CurrentUser = new FakeCurrentUserService();
        DbContext = new RestaurantBillDbContext(options, CurrentUser);
        Db = DbContext;
    }

    protected async Task<User> SeedActorAsync(string fullName = "Test Kullanıcı", Guid? userId = null)
    {
        User user = User.Create(fullName, "test@test.com", "5551234567");
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(user, userId ?? CurrentUser.UserId);
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync();
        return user;
    }

    public void Dispose() => DbContext.Dispose();
}
