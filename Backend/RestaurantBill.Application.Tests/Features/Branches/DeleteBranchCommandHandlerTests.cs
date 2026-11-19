using RestaurantBill.Application.Features.CustomerSite;
using RestaurantBill.Application.Features.Restaurants.Commands.DeleteBranch;
using RestaurantBill.Application.Features.Restaurants.Queries.GetMyBranches;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Application.Tests.Features.Branches;

public class DeleteBranchCommandHandlerTests : ApplicationTestBase
{
    private User _owner = default!;
    private Company _company = default!;
    private FakeCurrentUserService _ownerUser = default!;

    private static void Set(BaseEntity entity, string property, object value)
        => typeof(BaseEntity).GetProperty(property)!.SetValue(entity, value);

    private async Task<Branch> AddBranchAsync(string name, DateTime createdAt)
    {
        Branch branch = Branch.Create(_company.Id, name, "Yönetici", "111", "b@mail.com", "İstanbul", "Kadıköy", "Adres", 0);
        Set(branch, nameof(BaseEntity.Id), Guid.NewGuid());
        Set(branch, nameof(BaseEntity.CreatedAt), createdAt);
        DbContext.Branches.Add(branch);
        await DbContext.SaveChangesAsync();
        return branch;
    }

    // Sahip + iki şube: Merkez (en eski) ve Kadıköy.
    private async Task<(Branch Main, Branch Second)> SeedOwnerWithTwoBranchesAsync()
    {
        _owner = User.Create("Fatih", "owner@mail.com", "05001234567");
        Set(_owner, nameof(BaseEntity.Id), Guid.NewGuid());
        DbContext.Users.Add(_owner);
        _company = Company.Create("Test Restoran", _owner);
        DbContext.Companies.Add(_company);
        await DbContext.SaveChangesAsync();
        _ownerUser = new FakeCurrentUserService { UserId = _owner.Id, Role = "Owner", BranchId = _company.Id, CompanyId = _company.Id };

        Branch main = await AddBranchAsync("Merkez", DateTime.UtcNow.AddDays(-30));
        Branch second = await AddBranchAsync("Kadıköy", DateTime.UtcNow.AddDays(-10));
        return (main, second);
    }

    private async Task<Table> AddTableAsync(Branch branch)
    {
        Region region = Region.Create("Salon", branch.Id);
        DbContext.Regions.Add(region);
        Table table = Table.Create("Masa 1", "", region.Id);
        DbContext.Tables.Add(table);
        await DbContext.SaveChangesAsync();
        return table;
    }

    private DeleteBranchCommandHandler Handler(FakeCurrentUserService? user = null) => new(Db, user ?? _ownerUser);

    [Fact]
    public async Task Handle_BranchWithClosedHistory_SoftDeletesAndKeepsHistory()
    {
        (Branch main, Branch second) = await SeedOwnerWithTwoBranchesAsync();
        Table table = await AddTableAsync(second);
        Order paid = Order.Create(table.Id, second.Id);
        paid.UpdateStatus(OrderStatus.Cancelled);
        DbContext.Orders.Add(paid);
        await DbContext.SaveChangesAsync();

        var result = await Handler().Handle(new DeleteBranchCommand { BranchId = second.Id }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Branch stored = DbContext.Branches.Single(b => b.Id == second.Id);
        Assert.True(stored.IsDeleted);
        Assert.Single(DbContext.Orders.Where(o => o.BranchId == second.Id));
        Assert.Single(DbContext.Tables.Where(t => t.Id == table.Id));
        Assert.Contains(DbContext.AuditLogs, l => l.BranchId == second.Id && l.Action == "BranchDeleted");
        Assert.False(DbContext.Branches.Single(b => b.Id == main.Id).IsDeleted);
    }

    [Fact]
    public async Task Handle_DeletedBranch_DisappearsFromBranchListAndPublicSiteFallsBackToNextOldest()
    {
        (Branch main, Branch second) = await SeedOwnerWithTwoBranchesAsync();

        var result = await Handler().Handle(new DeleteBranchCommand { BranchId = main.Id }, CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);

        var branches = await new GetMyBranchesQueryHandler(Db, _ownerUser).Handle(new GetMyBranchesQuery(), CancellationToken.None);
        Assert.Equal([second.Id], branches.Value!.Select(b => b.Id));

        Branch? siteBranch = await CustomerSiteScope.ResolveBranchAsync(Db, _company.Id, null, CancellationToken.None);
        Assert.Equal(second.Id, siteBranch!.Id);
        Assert.Null(await CustomerSiteScope.ResolveBranchAsync(Db, _company.Id, main.Id, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_LastRemainingBranch_Fails()
    {
        (Branch main, Branch second) = await SeedOwnerWithTwoBranchesAsync();
        await Handler().Handle(new DeleteBranchCommand { BranchId = second.Id }, CancellationToken.None);

        DomainException ex = await Assert.ThrowsAsync<DomainException>(() =>
            Handler().Handle(new DeleteBranchCommand { BranchId = main.Id }, CancellationToken.None));

        Assert.Contains("son şubesi", ex.Message);
        Assert.False(DbContext.Branches.Single(b => b.Id == main.Id).IsDeleted);
    }

    [Fact]
    public async Task Handle_BranchWithStaff_FailsAndSaysSo()
    {
        (_, Branch second) = await SeedOwnerWithTwoBranchesAsync();
        User waiter = User.Create("Garson", "g@mail.com", "05001112233");
        DbContext.Users.Add(waiter);
        DbContext.UserBranches.Add(UserBranch.Create(waiter, second, "garson", null, UserRole.Waiter));
        await DbContext.SaveChangesAsync();

        DomainException ex = await Assert.ThrowsAsync<DomainException>(() =>
            Handler().Handle(new DeleteBranchCommand { BranchId = second.Id }, CancellationToken.None));

        Assert.Contains("1 personel", ex.Message);
        Assert.False(DbContext.Branches.Single(b => b.Id == second.Id).IsDeleted);
    }

    [Fact]
    public async Task Handle_BranchWhoseOnlyStaffWasDeleted_SoftDeletes()
    {
        // Çalışan silinince kullanıcı silinmiş sayılır ama şube bağlantısı kalır; bu engel değildir.
        (_, Branch second) = await SeedOwnerWithTwoBranchesAsync();
        User waiter = User.Create("Garson", "g@mail.com", "05001112233");
        DbContext.Users.Add(waiter);
        DbContext.UserBranches.Add(UserBranch.Create(waiter, second, "garson", null, UserRole.Waiter));
        waiter.MarkAsDeleted();
        await DbContext.SaveChangesAsync();

        await Handler().Handle(new DeleteBranchCommand { BranchId = second.Id }, CancellationToken.None);

        Assert.True(DbContext.Branches.Single(b => b.Id == second.Id).IsDeleted);
    }

    [Fact]
    public async Task Handle_BranchWithOpenOrder_Fails()
    {
        (_, Branch second) = await SeedOwnerWithTwoBranchesAsync();
        Table table = await AddTableAsync(second);
        DbContext.Orders.Add(Order.Create(table.Id, second.Id));
        await DbContext.SaveChangesAsync();

        DomainException ex = await Assert.ThrowsAsync<DomainException>(() =>
            Handler().Handle(new DeleteBranchCommand { BranchId = second.Id }, CancellationToken.None));

        Assert.Contains("1 açık adisyon", ex.Message);
    }

    [Fact]
    public async Task Handle_OnlyUpcomingReservationsBlock()
    {
        (_, Branch second) = await SeedOwnerWithTwoBranchesAsync();
        Table table = await AddTableAsync(second);
        DbContext.Reservations.Add(Reservation.Create(table, "Eski Misafir", "", DateTime.UtcNow.AddDays(-2), "", DateTime.UtcNow.AddDays(-2).AddHours(2)));
        DbContext.Reservations.Add(Reservation.Create(table, "Yeni Misafir", "", DateTime.UtcNow.AddDays(2), "", DateTime.UtcNow.AddDays(2).AddHours(2)));
        await DbContext.SaveChangesAsync();

        DomainException ex = await Assert.ThrowsAsync<DomainException>(() =>
            Handler().Handle(new DeleteBranchCommand { BranchId = second.Id }, CancellationToken.None));

        Assert.Contains("1 yaklaşan rezervasyon", ex.Message);
    }

    [Fact]
    public async Task Handle_OtherOwnersBranch_ReturnsNotFound()
    {
        (_, Branch second) = await SeedOwnerWithTwoBranchesAsync();
        var stranger = new FakeCurrentUserService { UserId = Guid.NewGuid(), Role = "Owner" };

        var result = await Handler(stranger).Handle(new DeleteBranchCommand { BranchId = second.Id }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.False(DbContext.Branches.Single(b => b.Id == second.Id).IsDeleted);
    }

    [Fact]
    public async Task Handle_AlreadyDeletedBranch_ReturnsNotFound()
    {
        (_, Branch second) = await SeedOwnerWithTwoBranchesAsync();
        await Handler().Handle(new DeleteBranchCommand { BranchId = second.Id }, CancellationToken.None);

        var result = await Handler().Handle(new DeleteBranchCommand { BranchId = second.Id }, CancellationToken.None);

        Assert.False(result.IsSuccess);
    }
}
