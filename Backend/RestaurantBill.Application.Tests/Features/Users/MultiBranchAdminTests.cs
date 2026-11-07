using RestaurantBill.Application.Features.Users.Commands.CreateUser;
using RestaurantBill.Application.Features.Users.Commands.UpdateUser;
using RestaurantBill.Application.Features.Users.Queries.GetUserByRestaurantId;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Users;

public class MultiBranchAdminTests : ApplicationTestBase
{
    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private async Task<(User Owner, Company Company, Branch First, Branch Second)> SeedOwnerWithTwoBranchesAsync()
    {
        User owner = User.Create("Sahip", "owner@mail.com", "05001234567");
        SetId(owner, Guid.NewGuid());
        owner.SetPasswordHash("hashed_x");
        DbContext.Users.Add(owner);

        Company company = Company.Create("Test Restoran", owner);
        DbContext.Companies.Add(company);

        Branch first = Branch.Create(company.Id, "Merkez", "Y", "111", "a@mail.com", "İstanbul", "Kadıköy", "Adres", 0);
        SetId(first, Guid.NewGuid());
        Branch second = Branch.Create(company.Id, "Teras", "Y", "222", "b@mail.com", "İstanbul", "Beşiktaş", "Adres", 0);
        SetId(second, Guid.NewGuid());
        DbContext.Branches.AddRange(first, second);

        await DbContext.SaveChangesAsync();
        return (owner, company, first, second);
    }

    private static FakeCurrentUserService OwnerIn(User owner, Company company, Branch branch)
        => new() { UserId = owner.Id, Role = "Owner", BranchId = branch.Id, CompanyId = company.Id };

    [Fact]
    public async Task CreateAdmin_WithTwoBranches_CreatesOneMembershipPerBranch()
    {
        (User owner, Company company, Branch first, Branch second) = await SeedOwnerWithTwoBranchesAsync();
        var handler = new CreateUserCommandHandler(Db, new FakePasswordHasher(), OwnerIn(owner, company, first));

        var result = await handler.Handle(new CreateUserCommand
        {
            FullName = "Çok Şubeli Admin",
            UserName = "admin2",
            UserCode = "0002",
            PhoneNumber = "05009876543",
            PasswordHash = "123456",
            Role = UserRole.Admin,
            BranchIds = [first.Id, second.Id]
        }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        User created = Assert.Single(DbContext.Users.Where(u => u.FullName == "Çok Şubeli Admin"));
        List<UserBranch> memberships = DbContext.UserBranches.Where(ub => ub.UserId == created.Id).ToList();
        Assert.Equal(2, memberships.Count);
        Assert.All(memberships, m => Assert.Equal("admin2", m.UserName));
        Assert.All(memberships, m => Assert.Equal(UserRole.Admin, m.Role));
        Assert.Contains(memberships, m => m.BranchId == first.Id);
        Assert.Contains(memberships, m => m.BranchId == second.Id);
    }

    [Fact]
    public async Task CreateWaiter_WithTwoBranches_Fails()
    {
        (User owner, Company company, Branch first, Branch second) = await SeedOwnerWithTwoBranchesAsync();
        var handler = new CreateUserCommandHandler(Db, new FakePasswordHasher(), OwnerIn(owner, company, first));

        var result = await handler.Handle(new CreateUserCommand
        {
            FullName = "Garson",
            UserName = "garson",
            PasswordHash = "123456",
            Role = UserRole.Waiter,
            BranchIds = [first.Id, second.Id]
        }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Empty(DbContext.UserBranches);
    }

    [Fact]
    public async Task UpdateAdmin_BranchIds_AddsRemovesAndRestoresMemberships()
    {
        (User owner, Company company, Branch first, Branch second) = await SeedOwnerWithTwoBranchesAsync();

        User admin = User.Create("Admin", "admin@mail.com", "05005555555");
        SetId(admin, Guid.NewGuid());
        admin.SetPasswordHash("hashed_y");
        DbContext.Users.Add(admin);
        DbContext.UserBranches.Add(UserBranch.Create(admin, first, "admin", "0001", UserRole.Admin));
        await DbContext.SaveChangesAsync();

        var handler = new UpdateUserCommandHandler(Db, new FakePasswordHasher(), OwnerIn(owner, company, first));
        UpdateUserCommand Command(params Guid[] branchIds) => new()
        {
            UserId = admin.Id, FullName = "Admin", UserName = "admin", PhoneNumber = "05005555555",
            Role = UserRole.Admin, BranchIds = branchIds.ToList()
        };

        // Teras eklenir
        var add = await handler.Handle(Command(first.Id, second.Id), CancellationToken.None);
        Assert.True(add.IsSuccess, add.Error);
        Assert.Equal(2, DbContext.UserBranches.Count(ub => ub.UserId == admin.Id && !ub.IsDeleted));

        // Merkez çıkarılır: satır silinmez, soft-delete olur
        var remove = await handler.Handle(Command(second.Id), CancellationToken.None);
        Assert.True(remove.IsSuccess, remove.Error);
        UserBranch merkez = DbContext.UserBranches.Single(ub => ub.UserId == admin.Id && ub.BranchId == first.Id);
        Assert.True(merkez.IsDeleted);
        Assert.Single(DbContext.UserBranches.Where(ub => ub.UserId == admin.Id && !ub.IsDeleted));

        // Merkez yeniden atanır: aynı satır geri açılır, yeni satır eklenmez
        var restore = await handler.Handle(Command(first.Id, second.Id), CancellationToken.None);
        Assert.True(restore.IsSuccess, restore.Error);
        Assert.Equal(2, DbContext.UserBranches.Count(ub => ub.UserId == admin.Id));
        Assert.All(DbContext.UserBranches.Where(ub => ub.UserId == admin.Id), ub => Assert.False(ub.IsDeleted));
    }

    [Fact]
    public async Task UpdateAdmin_EmptyBranchIds_Fails()
    {
        (User owner, Company company, Branch first, _) = await SeedOwnerWithTwoBranchesAsync();
        User admin = User.Create("Admin", "admin@mail.com", "05005555555");
        SetId(admin, Guid.NewGuid());
        DbContext.Users.Add(admin);
        DbContext.UserBranches.Add(UserBranch.Create(admin, first, "admin", "0001", UserRole.Admin));
        await DbContext.SaveChangesAsync();

        var handler = new UpdateUserCommandHandler(Db, new FakePasswordHasher(), OwnerIn(owner, company, first));
        var result = await handler.Handle(new UpdateUserCommand
        {
            UserId = admin.Id, FullName = "Admin", UserName = "admin", PhoneNumber = "05005555555",
            Role = UserRole.Admin, BranchIds = []
        }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Single(DbContext.UserBranches.Where(ub => ub.UserId == admin.Id && !ub.IsDeleted));
    }

    [Fact]
    public async Task StaffList_ReturnsOneRowPerUser_WithAllBranches_AndScopesOwnerToActiveBranch()
    {
        (User owner, Company company, Branch first, Branch second) = await SeedOwnerWithTwoBranchesAsync();

        User admin = User.Create("Admin", "admin@mail.com", "05005555555");
        SetId(admin, Guid.NewGuid());
        DbContext.Users.Add(admin);
        DbContext.UserBranches.Add(UserBranch.Create(admin, first, "admin", "0001", UserRole.Admin));
        DbContext.UserBranches.Add(UserBranch.Create(admin, second, "admin", "0001", UserRole.Admin));

        User waiter = User.Create("Teras Garsonu", "", "");
        SetId(waiter, Guid.NewGuid());
        DbContext.Users.Add(waiter);
        DbContext.UserBranches.Add(UserBranch.Create(waiter, second, "garson", "1001", UserRole.Waiter));
        await DbContext.SaveChangesAsync();

        // Şube modunda (Merkez): admin görünür (iki şubesiyle), Teras garsonu görünmez
        var inBranch = await new GetUserByRestaurantIdCommandHandler(Db, OwnerIn(owner, company, first))
            .Handle(new GetUserByRestaurantIdCommand(), CancellationToken.None);
        Assert.True(inBranch.IsSuccess);
        var row = Assert.Single(inBranch.Value!);
        Assert.Equal(admin.Id, row.Id);
        Assert.Equal(2, row.BranchIds.Count);
        Assert.Contains("Merkez", row.BranchName);
        Assert.Contains("Teras", row.BranchName);

        // Tümü modunda: herkes, kullanıcı başına tek satır
        var all = await new GetUserByRestaurantIdCommandHandler(Db, new FakeCurrentUserService { UserId = owner.Id, Role = "Owner", BranchId = company.Id, CompanyId = company.Id })
            .Handle(new GetUserByRestaurantIdCommand(), CancellationToken.None);
        Assert.Equal(2, all.Value!.Count());
    }
}
