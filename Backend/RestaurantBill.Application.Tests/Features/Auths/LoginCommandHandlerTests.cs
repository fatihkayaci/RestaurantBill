using RestaurantBill.Application.Features.Auths.Commands.Login;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Auths;

public class LoginCommandHandlerTests : ApplicationTestBase
{
    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private static User CreateOwnerWithId(string email = "owner@mail.com", string password = "sifre123")
    {
        User user = User.Create("Fatih", email, "05001234567");
        SetId(user, Guid.NewGuid());
        user.SetPasswordHash($"hashed_{password}");
        return user;
    }

    private LoginCommandHandler CreateHandler(FakeTenantResolver tenantResolver)
        => new(Db, new FakePasswordHasher(), new FakeJwtTokenGenerator(), tenantResolver);

    [Fact]
    public async Task Handle_OwnerLoginWithoutSlug_UnverifiedPhone_ReturnsFullTokenWithoutFlag()
    {
        User owner = CreateOwnerWithId();
        DbContext.Users.Add(owner);
        DbContext.Companies.Add(Company.Create("Test Restoran", owner));
        await DbContext.SaveChangesAsync();

        var handler = CreateHandler(new FakeTenantResolver { Slug = null });
        var result = await handler.Handle(new LoginCommand { Email = "owner@mail.com", Password = "sifre123" }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.False(result.Value!.NeedsPhoneVerification);
        Assert.StartsWith("token:", result.Value!.Token);
    }

    [Fact]
    public async Task Handle_OwnerLoginWithoutSlug_VerifiedPhone_ReturnsFullTokenWithoutFlag()
    {
        User owner = CreateOwnerWithId();
        owner.MarkPhoneVerified();
        DbContext.Users.Add(owner);
        DbContext.Companies.Add(Company.Create("Test Restoran", owner));
        await DbContext.SaveChangesAsync();

        var handler = CreateHandler(new FakeTenantResolver { Slug = null });
        var result = await handler.Handle(new LoginCommand { Email = "owner@mail.com", Password = "sifre123" }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.False(result.Value!.NeedsPhoneVerification);
        Assert.StartsWith("token:", result.Value!.Token);
    }

    [Fact]
    public async Task Handle_OwnerLoginWithSlug_UnverifiedPhone_ReturnsFullTokenWithoutFlag()
    {
        User owner = CreateOwnerWithId();
        DbContext.Users.Add(owner);
        Company company = Company.Create("Test Restoran", owner);
        company.Slug = "test-restoran";
        DbContext.Companies.Add(company);
        await DbContext.SaveChangesAsync();

        var handler = CreateHandler(new FakeTenantResolver { Slug = "test-restoran" });
        var result = await handler.Handle(new LoginCommand { Email = "owner@mail.com", Password = "sifre123" }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.False(result.Value!.NeedsPhoneVerification);
        Assert.StartsWith("token:", result.Value!.Token);
    }

    [Fact]
    public async Task Handle_EmployeeLogin_UnverifiedPhone_IsNotBlocked()
    {
        User owner = CreateOwnerWithId();
        DbContext.Users.Add(owner);
        Company company = Company.Create("Test Restoran", owner);
        company.Slug = "test-restoran";
        DbContext.Companies.Add(company);

        Branch branch = Branch.Create(company.Id, "Merkez Şube", "Yönetici", "111", "b@mail.com", "İstanbul", "Kadıköy", "Adres", 0);
        SetId(branch, Guid.NewGuid());
        DbContext.Branches.Add(branch);

        User employee = User.Create("Çalışan", "", "");
        SetId(employee, Guid.NewGuid());
        employee.SetPasswordHash("hashed_sifre456");
        DbContext.Users.Add(employee);
        DbContext.UserBranches.Add(UserBranch.Create(employee, branch, "calisan", "USR01", UserRole.Waiter));
        await DbContext.SaveChangesAsync();

        var handler = CreateHandler(new FakeTenantResolver { Slug = "test-restoran" });
        var result = await handler.Handle(new LoginCommand { UserName = "calisan", Password = "sifre456" }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.False(result.Value!.NeedsPhoneVerification);
        Assert.StartsWith("token:", result.Value!.Token);
    }
}
