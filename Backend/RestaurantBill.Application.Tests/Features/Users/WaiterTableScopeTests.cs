using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Orders.Commands.CreateOrder;
using RestaurantBill.Application.Features.Tables.Queries.GetAllTable;
using RestaurantBill.Application.Features.Users.Commands.UpdateUser;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Users;

// Garsonun bölge içinde masa seçimi: "Seçili masalar" denmiş bölgede yalnızca seçili masalar, diğerlerinde bölgenin tamamı.
public class WaiterTableScopeTests : ApplicationTestBase
{
    private Branch? _branch;

    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private async Task<Branch> BranchAsync()
    {
        if (_branch is not null) return _branch;
        _branch = Branch.Create("Test Restoran");
        SetId(_branch, CurrentUser.BranchId);
        DbContext.Branches.Add(_branch);
        await DbContext.SaveChangesAsync();
        return _branch;
    }

    private async Task<FakeCurrentUserService> SeedWaiterAsync(Action<UserBranch> configure)
    {
        Branch branch = await BranchAsync();
        User user = User.Create("Garson", "", "");
        DbContext.Users.Add(user);
        UserBranch membership = UserBranch.Create(user, branch, $"g{Guid.NewGuid():N}"[..10], null, UserRole.Waiter);
        configure(membership);
        DbContext.UserBranches.Add(membership);
        await DbContext.SaveChangesAsync();

        return new FakeCurrentUserService { BranchId = CurrentUser.BranchId, CompanyId = CurrentUser.CompanyId, UserId = user.Id, Role = "Waiter" };
    }

    private async Task<Table> SeedTableInAsync(Region region, string name)
    {
        Table table = Table.Create(name, "", region.Id);
        DbContext.Tables.Add(table);
        await DbContext.SaveChangesAsync();
        return table;
    }

    // Bahçe: B1, B2, B3 · Salon: S1. Garson iki bölgede, Bahçe'den yalnızca B1 ve B2'yi seçmiş.
    private async Task<(FakeCurrentUserService waiter, Table b1, Table b2, Table b3, Table s1)> SeedRestrictedWaiterAsync()
    {
        Region bahce = await SeedRegionAsync();
        Region salon = await SeedRegionAsync();
        Table b1 = await SeedTableInAsync(bahce, "B1");
        Table b2 = await SeedTableInAsync(bahce, "B2");
        Table b3 = await SeedTableInAsync(bahce, "B3");
        Table s1 = await SeedTableInAsync(salon, "S1");
        FakeCurrentUserService waiter = await SeedWaiterAsync(m =>
        {
            m.SetRegions([bahce.Id, salon.Id]);
            m.SetTableRestriction([bahce.Id], [b1.Id, b2.Id]);
        });
        return (waiter, b1, b2, b3, s1);
    }

    [Fact]
    public async Task Waiter_WithPickedTables_AccessesOnlyThoseInThatRegion_AndAllOfUnpickedRegion()
    {
        (FakeCurrentUserService waiter, Table b1, Table b2, Table b3, Table s1) = await SeedRestrictedWaiterAsync();

        Assert.Null(await Db.CheckTableAccessAsync(waiter, b1.Id, null, CancellationToken.None));
        Assert.Null(await Db.CheckTableAccessAsync(waiter, b2.Id, null, CancellationToken.None));
        Assert.Null(await Db.CheckTableAccessAsync(waiter, s1.Id, null, CancellationToken.None));
        Assert.Equal(StaffAccess.RegionDeniedMessage, await Db.CheckTableAccessAsync(waiter, b3.Id, null, CancellationToken.None));

        // Gerçek bir işlem de aynı kuralı uygular.
        var denied = await new CreateOrderCommandHandler(Db, waiter).Handle(new CreateOrderCommand { TableId = b3.Id }, CancellationToken.None);
        var allowed = await new CreateOrderCommandHandler(Db, waiter).Handle(new CreateOrderCommand { TableId = b1.Id }, CancellationToken.None);
        Assert.False(denied.IsSuccess);
        Assert.Equal(StaffAccess.RegionDeniedMessage, denied.Error);
        Assert.True(allowed.IsSuccess);
    }

    [Fact]
    public async Task Waiter_TableList_IsFilteredTheSameWay()
    {
        (FakeCurrentUserService waiter, Table b1, Table b2, _, Table s1) = await SeedRestrictedWaiterAsync();

        var result = await new GetAllTableQueryHandler(Db, waiter).Handle(new GetAllTableQuery(), CancellationToken.None);

        Assert.Equal(new[] { b1.Id, b2.Id, s1.Id }.Order(), result.Value!.Select(t => t.Id).Order());
    }

    [Fact]
    public async Task Admin_IsNotAffectedByWaiterTablePicks()
    {
        (_, _, _, Table b3, _) = await SeedRestrictedWaiterAsync();
        await SeedActorAsync();

        var tables = await new GetAllTableQueryHandler(Db, CurrentUser).Handle(new GetAllTableQuery(), CancellationToken.None);

        Assert.Equal(4, tables.Value!.Count);
        Assert.Null(await Db.CheckTableAccessAsync(CurrentUser, b3.Id, null, CancellationToken.None));
    }

    // Bölgedeki tek seçili masa silinirse garson o bölgede hiçbir masaya bakmaz; bölgenin tamamını kazanmaz.
    [Fact]
    public async Task OnlyPickedTableDeleted_WaiterLosesThatRegion_AndDoesNotGainIt()
    {
        Region bahce = await SeedRegionAsync();
        Region salon = await SeedRegionAsync();
        Table b1 = await SeedTableInAsync(bahce, "B1");
        Table b3 = await SeedTableInAsync(bahce, "B3");
        Table s1 = await SeedTableInAsync(salon, "S1");
        FakeCurrentUserService waiter = await SeedWaiterAsync(m =>
        {
            m.SetRegions([bahce.Id, salon.Id]);
            m.SetTableRestriction([bahce.Id], [b1.Id]);
        });

        DbContext.Tables.Remove(b1);
        await DbContext.SaveChangesAsync();

        var list = await new GetAllTableQueryHandler(Db, waiter).Handle(new GetAllTableQuery(), CancellationToken.None);
        Assert.Equal(s1.Id, Assert.Single(list.Value!).Id);
        Assert.Equal(StaffAccess.RegionDeniedMessage, await Db.CheckTableAccessAsync(waiter, b3.Id, null, CancellationToken.None));
    }

    // Seçili masa başka bölgeye taşınınca: tamamına bakılan bölgeye geçtiyse fazladan bir şey katmaz, seçilmemiş bir
    // bölgeye geçtiyse kapsam dışı kalır; eski bölgesinde de masa kalmadığı için yetki genişlemez.
    [Fact]
    public async Task PickedTableMoved_NeverWidensAccess()
    {
        Region bahce = await SeedRegionAsync();
        Region salon = await SeedRegionAsync();
        Region teras = await SeedRegionAsync();
        Table b1 = await SeedTableInAsync(bahce, "B1");
        Table b2 = await SeedTableInAsync(bahce, "B2");
        Table b3 = await SeedTableInAsync(bahce, "B3");
        Table s1 = await SeedTableInAsync(salon, "S1");
        FakeCurrentUserService waiter = await SeedWaiterAsync(m =>
        {
            m.SetRegions([bahce.Id, salon.Id]);
            m.SetTableRestriction([bahce.Id], [b1.Id, b2.Id]);
        });

        b1.AssignRegion(salon.Id);
        b2.AssignRegion(teras.Id);
        await DbContext.SaveChangesAsync();

        var list = await new GetAllTableQueryHandler(Db, waiter).Handle(new GetAllTableQuery(), CancellationToken.None);
        Assert.Equal(new[] { b1.Id, s1.Id }.Order(), list.Value!.Select(t => t.Id).Order());
        Assert.Equal(StaffAccess.RegionDeniedMessage, await Db.CheckTableAccessAsync(waiter, b2.Id, null, CancellationToken.None));
        Assert.Equal(StaffAccess.RegionDeniedMessage, await Db.CheckTableAccessAsync(waiter, b3.Id, null, CancellationToken.None));
    }

    // Kayıt davranışı: şubeye ya da seçili bölgelere ait olmayan masalar hata vermeden atılır.
    [Fact]
    public async Task UpdateUser_DropsTablesOutsideBranchOrSelectedRegions()
    {
        Region bahce = await SeedRegionAsync();
        Region salon = await SeedRegionAsync();
        Region foreignRegion = await SeedRegionAsync(Guid.NewGuid());
        Table b1 = await SeedTableInAsync(bahce, "B1");
        Table s1 = await SeedTableInAsync(salon, "S1");
        Table foreign = await SeedTableInAsync(foreignRegion, "X1");
        await SeedActorAsync();
        FakeCurrentUserService waiter = await SeedWaiterAsync(_ => { });
        UserBranch membership = Assert.Single(DbContext.UserBranches.Where(ub => ub.UserId == waiter.UserId));
        var handler = new UpdateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);

        var result = await handler.Handle(new UpdateUserCommand
        {
            UserId = waiter.UserId, FullName = "Garson", UserName = "garson1", Role = UserRole.Waiter,
            RegionIds = [bahce.Id], RestrictedRegionIds = [bahce.Id, salon.Id], TableIds = [b1.Id, s1.Id, foreign.Id, Guid.NewGuid()]
        }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal([bahce.Id], membership.RestrictedRegionIds);
        Assert.Equal([b1.Id], membership.TableIds);
    }

    [Fact]
    public async Task UpdateUser_RemovingRegion_DropsItsTables_EvenWhenTablesAreNotSent()
    {
        Region bahce = await SeedRegionAsync();
        Region salon = await SeedRegionAsync();
        Table b1 = await SeedTableInAsync(bahce, "B1");
        Table s1 = await SeedTableInAsync(salon, "S1");
        await SeedActorAsync();
        FakeCurrentUserService waiter = await SeedWaiterAsync(m =>
        {
            m.SetRegions([bahce.Id, salon.Id]);
            m.SetTableRestriction([bahce.Id, salon.Id], [b1.Id, s1.Id]);
        });
        UserBranch membership = Assert.Single(DbContext.UserBranches.Where(ub => ub.UserId == waiter.UserId));
        var handler = new UpdateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);

        var result = await handler.Handle(new UpdateUserCommand
        {
            UserId = waiter.UserId, FullName = "Garson", UserName = "garson1", Role = UserRole.Waiter, RegionIds = [salon.Id]
        }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal([salon.Id], membership.RestrictedRegionIds);
        Assert.Equal([s1.Id], membership.TableIds);
    }

    [Fact]
    public async Task UpdateUser_BackToAllTables_DropsRegionPicks_AndEmptyRestrictionIsKept()
    {
        Region bahce = await SeedRegionAsync();
        Region salon = await SeedRegionAsync();
        Table b1 = await SeedTableInAsync(bahce, "B1");
        Table s1 = await SeedTableInAsync(salon, "S1");
        await SeedActorAsync();
        FakeCurrentUserService waiter = await SeedWaiterAsync(m =>
        {
            m.SetRegions([bahce.Id, salon.Id]);
            m.SetTableRestriction([bahce.Id, salon.Id], [b1.Id, s1.Id]);
        });
        UserBranch membership = Assert.Single(DbContext.UserBranches.Where(ub => ub.UserId == waiter.UserId));
        var handler = new UpdateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);

        // Bahçe "Tüm masalar"a döndü, Salon masa masa ama hiç masa seçili değil.
        var result = await handler.Handle(new UpdateUserCommand
        {
            UserId = waiter.UserId, FullName = "Garson", UserName = "garson1", Role = UserRole.Waiter,
            RegionIds = [bahce.Id, salon.Id], RestrictedRegionIds = [salon.Id], TableIds = [b1.Id]
        }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal([salon.Id], membership.RestrictedRegionIds);
        Assert.Empty(membership.TableIds);
        var list = await new GetAllTableQueryHandler(Db, waiter).Handle(new GetAllTableQuery(), CancellationToken.None);
        Assert.Equal(b1.Id, Assert.Single(list.Value!).Id);
    }

    [Fact]
    public async Task UpdateUser_AllRegions_ClearsTables()
    {
        Region bahce = await SeedRegionAsync();
        Table b1 = await SeedTableInAsync(bahce, "B1");
        await SeedActorAsync();
        FakeCurrentUserService waiter = await SeedWaiterAsync(_ => { });
        UserBranch membership = Assert.Single(DbContext.UserBranches.Where(ub => ub.UserId == waiter.UserId));
        var handler = new UpdateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);

        var result = await handler.Handle(new UpdateUserCommand
        {
            UserId = waiter.UserId, FullName = "Garson", UserName = "garson1", Role = UserRole.Waiter,
            RegionIds = [], RestrictedRegionIds = [bahce.Id], TableIds = [b1.Id]
        }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(membership.RestrictedRegionIds);
        Assert.Empty(membership.TableIds);
    }

    [Fact]
    public void Resolve_UsesTheStoredFlag_AndIgnoresPicksOutsideRestrictedRegions()
    {
        Guid bahce = Guid.NewGuid(), salon = Guid.NewGuid(), teras = Guid.NewGuid(), foreign = Guid.NewGuid();
        Guid b1 = Guid.NewGuid(), s1 = Guid.NewGuid(), t1 = Guid.NewGuid();

        // Bahçe ve Teras masa masa (Teras'ta seçili masa yok), Salon tamamı; RegionIds dışındaki işaret yok sayılır.
        WaiterScope scope = WaiterScope.Resolve([bahce, salon, teras], [bahce, teras, foreign], [(b1, bahce), (s1, salon), (t1, foreign)]);

        Assert.Equal([salon], scope.WholeRegionIds);
        Assert.Equal([b1], scope.TableIds);
        Assert.True(scope.Covers(b1, bahce));
        Assert.False(scope.Covers(Guid.NewGuid(), bahce));
        Assert.False(scope.Covers(Guid.NewGuid(), teras));
        Assert.True(scope.Covers(Guid.NewGuid(), salon));
        Assert.False(scope.Covers(t1, foreign));
    }
}
