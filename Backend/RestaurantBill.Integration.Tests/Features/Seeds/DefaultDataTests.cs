using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Integration.Tests.Infrastructure;
using RestaurantBill.Persistence.Context;
using RestaurantBill.Persistence.Seeds;

namespace RestaurantBill.Integration.Tests.Features.Seeds;

public class DefaultDataTests
{
    [Fact]
    public async Task Seed_CreatesDemoStaff_IncludingTheCourier()
    {
        var options = new DbContextOptionsBuilder<RestaurantBillDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var context = new RestaurantBillDbContext(options, new FakeCurrentUserService());
        var hasher = new PasswordHasher<User>();

        await DefaultData.SeedAsync(context, hasher);

        UserBranch courier = await context.UserBranches.Include(ub => ub.User).SingleAsync(ub => ub.UserName == "courier");
        Assert.Equal(UserRole.Courier, courier.Role);
        Assert.Equal(PasswordVerificationResult.Success, hasher.VerifyHashedPassword(courier.User, courier.User.PasswordHash, "Courier123*"));
        Assert.Equal(5, await context.UserBranches.CountAsync());
    }
}
