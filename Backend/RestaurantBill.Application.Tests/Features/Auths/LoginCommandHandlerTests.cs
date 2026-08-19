using RestaurantBill.Application.Features.Auths.Commands.Login;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Auths;

public class LoginCommandHandlerTests
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

    private static LoginCommandHandler CreateHandler(FakeUnitOfWork uow, FakeTenantResolver tenantResolver)
        => new(uow, new FakePasswordHasher(), new FakeJwtTokenGenerator(), tenantResolver);

    [Fact]
    public async Task Handle_OwnerLoginWithoutSlug_UnverifiedPhone_ReturnsTransitionTokenAndFlag()
    {
        var uow = new FakeUnitOfWork();
        User owner = CreateOwnerWithId();
        await uow.UserRepo.AddAsync(owner);
        await uow.CompanyRepo.AddAsync(Company.Create("Test Restoran", owner));

        var handler = CreateHandler(uow, new FakeTenantResolver { Slug = null });
        var result = await handler.Handle(new LoginCommand { Email = "owner@mail.com", Password = "sifre123" }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(result.Value!.NeedsPhoneVerification);
        Assert.StartsWith("transition:", result.Value!.Token);
    }

    [Fact]
    public async Task Handle_OwnerLoginWithoutSlug_VerifiedPhone_ReturnsFullTokenWithoutFlag()
    {
        var uow = new FakeUnitOfWork();
        User owner = CreateOwnerWithId();
        owner.MarkPhoneVerified();
        await uow.UserRepo.AddAsync(owner);
        await uow.CompanyRepo.AddAsync(Company.Create("Test Restoran", owner));

        var handler = CreateHandler(uow, new FakeTenantResolver { Slug = null });
        var result = await handler.Handle(new LoginCommand { Email = "owner@mail.com", Password = "sifre123" }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.False(result.Value!.NeedsPhoneVerification);
        Assert.StartsWith("token:", result.Value!.Token);
    }

    [Fact]
    public async Task Handle_OwnerLoginWithSlug_UnverifiedPhone_ReturnsTransitionTokenAndFlag()
    {
        var uow = new FakeUnitOfWork();
        User owner = CreateOwnerWithId();
        await uow.UserRepo.AddAsync(owner);
        Company company = Company.Create("Test Restoran", owner);
        company.Slug = "test-restoran";
        await uow.CompanyRepo.AddAsync(company);

        var handler = CreateHandler(uow, new FakeTenantResolver { Slug = "test-restoran" });
        var result = await handler.Handle(new LoginCommand { Email = "owner@mail.com", Password = "sifre123" }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(result.Value!.NeedsPhoneVerification);
        Assert.StartsWith("transition:", result.Value!.Token);
    }

    [Fact]
    public async Task Handle_EmployeeLogin_UnverifiedPhone_IsNotBlocked()
    {
        var uow = new FakeUnitOfWork();
        User owner = CreateOwnerWithId();
        await uow.UserRepo.AddAsync(owner);
        Company company = Company.Create("Test Restoran", owner);
        company.Slug = "test-restoran";
        await uow.CompanyRepo.AddAsync(company);

        Branch branch = Branch.Create(company.Id, "Merkez Şube", "Yönetici", "111", "b@mail.com", "İstanbul", "Kadıköy", "Adres", 0);
        SetId(branch, Guid.NewGuid());
        await uow.RestaurantRepo.AddAsync(branch);

        User employee = User.Create("Çalışan", "", "");
        SetId(employee, Guid.NewGuid());
        employee.SetPasswordHash("hashed_sifre456");
        await uow.UserRepo.AddAsync(employee);
        await uow.UserRestaurantRepo.AddAsync(UserBranch.Create(employee, branch, "calisan", "USR01", UserRole.Waiter));

        var handler = CreateHandler(uow, new FakeTenantResolver { Slug = "test-restoran" });
        var result = await handler.Handle(new LoginCommand { UserName = "calisan", Password = "sifre456" }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.False(result.Value!.NeedsPhoneVerification);
        Assert.StartsWith("token:", result.Value!.Token);
    }
}
