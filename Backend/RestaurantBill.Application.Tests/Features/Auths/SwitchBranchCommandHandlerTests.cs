using Microsoft.Extensions.Configuration;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Auths.Commands.SwitchBranch;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Auths;

public class SwitchBranchCommandHandlerTests : ApplicationTestBase
{
    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private SwitchBranchCommandHandler CreateHandler(FakeCurrentUserService currentUser)
        => new(Db, currentUser, new FakeJwtTokenGenerator(), new ConfigurationBuilder().Build());

    private async Task<(User Owner, Company Company, Branch Branch)> SeedOwnerWithBranchAsync()
    {
        User owner = User.Create("Fatih", "owner@mail.com", "05001234567");
        SetId(owner, Guid.NewGuid());
        owner.SetPasswordHash("hashed_sifre123");
        DbContext.Users.Add(owner);

        Company company = Company.Create("Test Restoran", owner);
        DbContext.Companies.Add(company);

        Branch branch = Branch.Create(company.Id, "Merkez Şube", "Yönetici", "111", "b@mail.com", "İstanbul", "Kadıköy", "Adres", 0);
        SetId(branch, Guid.NewGuid());
        DbContext.Branches.Add(branch);

        await DbContext.SaveChangesAsync();
        return (owner, company, branch);
    }

    private async Task<Branch> SeedForeignBranchAsync()
    {
        User otherOwner = User.Create("Başkası", "other@mail.com", "05009999999");
        SetId(otherOwner, Guid.NewGuid());
        otherOwner.SetPasswordHash("hashed_x");
        DbContext.Users.Add(otherOwner);

        Company otherCompany = Company.Create("Başka Restoran", otherOwner);
        DbContext.Companies.Add(otherCompany);

        Branch foreign = Branch.Create(otherCompany.Id, "Yabancı Şube", "Y", "222", "y@mail.com", "Ankara", "Çankaya", "Adres", 0);
        SetId(foreign, Guid.NewGuid());
        DbContext.Branches.Add(foreign);

        await DbContext.SaveChangesAsync();
        return foreign;
    }

    [Fact]
    public async Task Handle_OwnerSwitchesToOwnedBranch_ReturnsBranchScopedToken()
    {
        (User owner, Company company, Branch branch) = await SeedOwnerWithBranchAsync();
        var currentUser = new FakeCurrentUserService { UserId = owner.Id, Role = "Owner", BranchId = company.Id, CompanyId = company.Id };

        var result = await CreateHandler(currentUser).Handle(new SwitchBranchCommand { BranchId = branch.Id }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal($"token:{owner.Id}:{branch.Id}:Owner:{owner.Email}:{company.Id}", result.Value!.AccessToken);

        RefreshToken issued = DbContext.RefreshTokens.Single();
        Assert.Equal(branch.Id, issued.BranchId);
        Assert.Equal(UserRole.Owner, issued.Role);
    }

    [Fact]
    public async Task Handle_OwnerSwitchesToAll_ReturnsCompanyScopedToken()
    {
        (User owner, Company company, Branch branch) = await SeedOwnerWithBranchAsync();
        var currentUser = new FakeCurrentUserService { UserId = owner.Id, Role = "Owner", BranchId = branch.Id, CompanyId = company.Id };

        var result = await CreateHandler(currentUser).Handle(new SwitchBranchCommand { BranchId = null }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal($"token:{owner.Id}:{company.Id}:Owner:{owner.Email}:{company.Id}", result.Value!.AccessToken);
    }

    [Fact]
    public async Task Handle_OwnerSwitchesToForeignBranch_Fails()
    {
        (User owner, Company company, _) = await SeedOwnerWithBranchAsync();
        Branch foreign = await SeedForeignBranchAsync();
        var currentUser = new FakeCurrentUserService { UserId = owner.Id, Role = "Owner", BranchId = company.Id, CompanyId = company.Id };

        var result = await CreateHandler(currentUser).Handle(new SwitchBranchCommand { BranchId = foreign.Id }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Empty(DbContext.RefreshTokens);
    }

    [Fact]
    public async Task Handle_AdminSwitchesToAssignedBranch_Succeeds_AndUnassignedFails()
    {
        (_, Company company, Branch branch) = await SeedOwnerWithBranchAsync();
        Branch second = Branch.Create(company.Id, "İkinci Şube", "Y", "333", "s@mail.com", "İzmir", "Konak", "Adres", 0);
        SetId(second, Guid.NewGuid());
        DbContext.Branches.Add(second);

        User admin = User.Create("Yönetici", "admin@mail.com", "05005555555");
        SetId(admin, Guid.NewGuid());
        admin.SetPasswordHash("hashed_y");
        DbContext.Users.Add(admin);
        DbContext.UserBranches.Add(UserBranch.Create(admin, branch, "yonetici", "0001", UserRole.Admin));
        DbContext.UserBranches.Add(UserBranch.Create(admin, second, "yonetici", "0001", UserRole.Admin));
        await DbContext.SaveChangesAsync();

        Branch foreign = await SeedForeignBranchAsync();
        var currentUser = new FakeCurrentUserService { UserId = admin.Id, Role = "Admin", BranchId = branch.Id, CompanyId = company.Id };
        var handler = CreateHandler(currentUser);

        var ok = await handler.Handle(new SwitchBranchCommand { BranchId = second.Id }, CancellationToken.None);
        Assert.True(ok.IsSuccess);
        Assert.Equal($"token:{admin.Id}:{second.Id}:Admin:yonetici:{company.Id}", ok.Value!.AccessToken);

        var denied = await handler.Handle(new SwitchBranchCommand { BranchId = foreign.Id }, CancellationToken.None);
        Assert.False(denied.IsSuccess);

        var all = await handler.Handle(new SwitchBranchCommand { BranchId = null }, CancellationToken.None);
        Assert.False(all.IsSuccess);
    }

    [Fact]
    public async Task Handle_WaiterCannotSwitch()
    {
        (_, Company company, Branch branch) = await SeedOwnerWithBranchAsync();
        User waiter = User.Create("Garson", "", "");
        SetId(waiter, Guid.NewGuid());
        waiter.SetPasswordHash("hashed_w");
        DbContext.Users.Add(waiter);
        DbContext.UserBranches.Add(UserBranch.Create(waiter, branch, "garson", "1001", UserRole.Waiter));
        await DbContext.SaveChangesAsync();

        var currentUser = new FakeCurrentUserService { UserId = waiter.Id, Role = "Waiter", BranchId = branch.Id, CompanyId = company.Id };
        var result = await CreateHandler(currentUser).Handle(new SwitchBranchCommand { BranchId = branch.Id }, CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Handle_RevokesCurrentRefreshTokenAndKeepsRememberMe()
    {
        (User owner, Company company, Branch branch) = await SeedOwnerWithBranchAsync();

        string rawToken = RefreshTokenHasher.GenerateRawToken();
        RefreshToken current = RefreshToken.Create(owner.Id, company.Id, UserRole.Owner, RefreshTokenHasher.Hash(rawToken),
            DateTime.UtcNow.AddDays(30), DateTime.UtcNow.AddDays(30), rememberMe: true, null, null);
        DbContext.RefreshTokens.Add(current);
        await DbContext.SaveChangesAsync();

        var currentUser = new FakeCurrentUserService { UserId = owner.Id, Role = "Owner", BranchId = company.Id, CompanyId = company.Id };
        var result = await CreateHandler(currentUser).Handle(
            new SwitchBranchCommand { BranchId = branch.Id, CurrentRefreshToken = rawToken }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(result.Value!.RememberMe);
        Assert.NotNull(DbContext.RefreshTokens.Single(rt => rt.TokenHash == RefreshTokenHasher.Hash(rawToken)).RevokedAt);
        Assert.Single(DbContext.RefreshTokens, rt => rt.RevokedAt == null && rt.BranchId == branch.Id && rt.RememberMe);
    }
}
