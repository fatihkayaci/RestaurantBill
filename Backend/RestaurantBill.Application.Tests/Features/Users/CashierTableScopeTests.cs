using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Orders.Commands.CloseOrder;
using RestaurantBill.Application.Features.Orders.Commands.TransferOrder;
using RestaurantBill.Application.Features.Orders.Queries;
using RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToCashierQuery;
using RestaurantBill.Application.Features.Payments.Commands.CreatePayment;
using RestaurantBill.Application.Features.Tables.Queries.GetAllTable;
using RestaurantBill.Application.Features.Users.Commands.CreateUser;
using RestaurantBill.Application.Features.Users.Commands.UpdateUser;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Features.Waiter;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.Users;

// Kasiyerin bölge/masa kapsamı: garsonla aynı kural (kapsam dışı masa hiç görünmez, ödeme/kapatma/taşıma reddedilir,
// bölgesi boş kasiyer tüm masalara bakar). Garsondan farkı: paket (masasız) siparişleri kapsamı ne olursa olsun görür.
public class CashierTableScopeTests : WaiterTestBase
{
    private async Task<FakeCurrentUserService> SeedCashierAsync(Action<UserBranch>? configure = null)
    {
        User cashier = User.Create("Ayşe Kasiyer", $"{Guid.NewGuid():N}@test.com", "5550000000");
        DbContext.Users.Add(cashier);
        UserBranch membership = UserBranch.Create(cashier, Branch, "kasiyer" + Guid.NewGuid().ToString("N")[..6], null, UserRole.Cashier);
        configure?.Invoke(membership);
        DbContext.UserBranches.Add(membership);
        await DbContext.SaveChangesAsync();
        return new FakeCurrentUserService { UserId = cashier.Id, Role = "Cashier", BranchId = Branch.Id, CompanyId = CurrentUser.CompanyId };
    }

    // Yalnızca Salon'a bakan kasiyer; Teras kapsam dışı.
    private Task<FakeCurrentUserService> SeedSalonCashierAsync() => SeedCashierAsync(m => m.SetRegions([Salon.Id]));

    private async Task<Table> SeedEmptyTableAsync(Region region, string name)
    {
        Table table = Table.Create(name, "", region.Id);
        DbContext.Tables.Add(table);
        await DbContext.SaveChangesAsync();
        return table;
    }

    private async Task<Order> SeedDeliveryOrderAsync()
    {
        Order order = Order.CreateDelivery(Branch.Id, 30m);
        order.AddItemAtPrice(Product, 100m, 2, 10m);
        DbContext.Orders.Add(order);
        await DbContext.SaveChangesAsync();
        return order;
    }

    private async Task<Result<bool>> PayAsync(FakeCurrentUserService cashier, Order order)
    {
        var (register, _) = await SeedRegisterAsync("Kasa " + Guid.NewGuid().ToString("N")[..4], cashier.UserId);
        return await new CreatePaymentCommandHandler(Db, new FakeTableNotificationService(), new FakeCashierNotificationService(), cashier)
            .Handle(new CreatePaymentCommand
            {
                OrderId = order.Id,
                CashRegisterId = register.Id,
                PaymentMethod = PaymentMethod.Kart,
                Items = order.OrderItems.Select(i => new PaymentItemDto { OrderItemId = i.Id, Quantity = i.Quantity }).ToList(),
            }, CancellationToken.None);
    }

    private Task<Result<bool>> TransferAsync(FakeCurrentUserService cashier, Order order, Table destination) =>
        new TransferOrderCommandHandler(Db, new OrderQueries(Db), new FakeTableNotificationService(), new FakeCashierNotificationService(), cashier)
            .Handle(new TransferOrderCommand { SourceTableId = order.TableId!.Value, DestinationTableId = destination.Id, Mode = TableTransferMode.Move }, CancellationToken.None);

    [Fact]
    public async Task Cashier_WithRegions_TableList_HidesOutOfScopeTables()
    {
        await SeedBranchAsync();
        Table salonTable = await SeedEmptyTableAsync(Salon, "S1");
        await SeedEmptyTableAsync(Teras, "T1");
        FakeCurrentUserService cashier = await SeedSalonCashierAsync();

        var result = await new GetAllTableQueryHandler(Db, cashier).Handle(new GetAllTableQuery(), CancellationToken.None);

        Assert.Equal(salonTable.Id, Assert.Single(result.Value!).Id);
    }

    // Garsondaki "Seçili masalar" kuralı kasiyerde de geçerli: Teras'ta yalnızca seçili masa, Salon'un tamamı.
    [Fact]
    public async Task Cashier_WithPickedTables_SeesOnlyThoseInThatRegion()
    {
        await SeedBranchAsync();
        Table s1 = await SeedEmptyTableAsync(Salon, "S1");
        Table t1 = await SeedEmptyTableAsync(Teras, "T1");
        Table t2 = await SeedEmptyTableAsync(Teras, "T2");
        FakeCurrentUserService cashier = await SeedCashierAsync(m =>
        {
            m.SetRegions([Salon.Id, Teras.Id]);
            m.SetTableRestriction([Teras.Id], [t1.Id]);
        });

        var result = await new GetAllTableQueryHandler(Db, cashier).Handle(new GetAllTableQuery(), CancellationToken.None);

        Assert.Equal(new[] { s1.Id, t1.Id }.Order(), result.Value!.Select(t => t.Id).Order());
        Assert.Equal(StaffAccess.RegionDeniedMessage, await Db.CheckTableAccessAsync(cashier, t2.Id, null, CancellationToken.None));
    }

    [Fact]
    public async Task Cashier_WithoutRegions_SeesAllTables()
    {
        await SeedBranchAsync();
        await SeedEmptyTableAsync(Salon, "S1");
        await SeedEmptyTableAsync(Teras, "T1");
        Order terasOrder = await SeedOrderAsync(Teras, "T2");
        FakeCurrentUserService cashier = await SeedCashierAsync();

        var tables = await new GetAllTableQueryHandler(Db, cashier).Handle(new GetAllTableQuery(), CancellationToken.None);
        var bills = await new GetAllOrdersToCashierQueryHandler(Db, cashier).Handle(new GetAllOrdersToCashierQuery(), CancellationToken.None);

        Assert.Equal(3, tables.Value!.Count);
        Assert.Equal(terasOrder.Id, Assert.Single(bills.Value!).Id);
    }

    // Açık hesaplar listesi: kapsam dışı masanın hesabı yok, paket sipariş var.
    [Fact]
    public async Task Cashier_WithRegions_OpenBills_HideOutOfScopeTables_ButKeepDeliveryOrders()
    {
        await SeedBranchAsync();
        Order salonOrder = await SeedOrderAsync(Salon, "S1");
        await SeedOrderAsync(Teras, "T1");
        Order delivery = await SeedDeliveryOrderAsync();
        FakeCurrentUserService cashier = await SeedSalonCashierAsync();

        var result = await new GetAllOrdersToCashierQueryHandler(Db, cashier).Handle(new GetAllOrdersToCashierQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(new[] { salonOrder.Id, delivery.Id }.Order(), result.Value!.Select(o => o.Id).Order());
    }

    [Fact]
    public async Task Cashier_WithRegions_CanAccessDeliveryOrder_UnlikeWaiter()
    {
        await SeedBranchAsync();
        Order delivery = await SeedDeliveryOrderAsync();
        FakeCurrentUserService cashier = await SeedSalonCashierAsync();
        FakeCurrentUserService waiter = await SeedWaiterAsync(regionIds: [Salon.Id]);

        Assert.Null(await Db.CheckOrderAccessAsync(cashier, delivery, null, CancellationToken.None));
        Assert.Equal(StaffAccess.DeliveryDeniedMessage, await Db.CheckOrderAccessAsync(waiter, delivery, null, CancellationToken.None));
        Assert.False((await Db.GetStaffAccessAsync(cashier, CancellationToken.None)).IsWaiter);
    }

    [Fact]
    public async Task Cashier_CannotPayOutOfScopeTable_ButCanPayInScopeTable()
    {
        await SeedBranchAsync();
        Order salonOrder = await SeedOrderAsync(Salon, "S1");
        Order terasOrder = await SeedOrderAsync(Teras, "T1");
        FakeCurrentUserService cashier = await SeedSalonCashierAsync();

        var denied = await PayAsync(cashier, terasOrder);
        var allowed = await PayAsync(cashier, salonOrder);

        Assert.False(denied.IsSuccess);
        Assert.Equal(StaffAccess.RegionDeniedMessage, denied.Error);
        Assert.True(allowed.IsSuccess, allowed.Error);
        Assert.Equal(400m, await DbContext.Payments.SumAsync(p => p.TotalAmount));
    }

    [Fact]
    public async Task Cashier_CannotCloseOutOfScopeTable()
    {
        await SeedBranchAsync();
        Order terasOrder = await SeedOrderAsync(Teras, "T1");
        FakeCurrentUserService cashier = await SeedSalonCashierAsync();

        var result = await new CloseOrderCommandHandler(Db, new FakeTableNotificationService(), new FakeCashierNotificationService(), cashier)
            .Handle(new DeleteCommand { OrderId = terasOrder.Id }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(StaffAccess.RegionDeniedMessage, result.Error);
    }

    // Taşıma/birleştirmede kaynak da hedef de kasiyerin kapsamında olmalı.
    [Fact]
    public async Task Cashier_Transfer_RequiresSourceAndDestinationInScope()
    {
        await SeedBranchAsync();
        Order salonOrder = await SeedOrderAsync(Salon, "S1");
        Order terasOrder = await SeedOrderAsync(Teras, "T1");
        Table salonEmpty = await SeedEmptyTableAsync(Salon, "S9");
        Table terasEmpty = await SeedEmptyTableAsync(Teras, "T9");
        FakeCurrentUserService cashier = await SeedSalonCashierAsync();
        Guid salonSource = salonOrder.TableId!.Value;

        var toOutOfScope = await TransferAsync(cashier, salonOrder, terasEmpty);
        var fromOutOfScope = await TransferAsync(cashier, terasOrder, salonEmpty);

        Assert.False(toOutOfScope.IsSuccess);
        Assert.Equal(StaffAccess.RegionDeniedMessage, toOutOfScope.Error);
        Assert.Equal(salonSource, salonOrder.TableId);
        Assert.False(fromOutOfScope.IsSuccess);
        Assert.Equal(StaffAccess.RegionDeniedMessage, fromOutOfScope.Error);

        var inScope = await TransferAsync(cashier, salonOrder, salonEmpty);
        Assert.True(inScope.IsSuccess, inScope.Error);
        Assert.Equal(salonEmpty.Id, salonOrder.TableId);
    }

    [Fact]
    public async Task Admin_IsNotAffectedByCashierRegions()
    {
        await SeedBranchAsync();
        await SeedActorAsync();
        await SeedOrderAsync(Teras, "T1");
        await SeedSalonCashierAsync();

        var tables = await new GetAllTableQueryHandler(Db, CurrentUser).Handle(new GetAllTableQuery(), CancellationToken.None);

        Assert.Single(tables.Value!);
    }

    [Fact]
    public async Task CreateUser_Cashier_StoresRegionsAndTablePicks()
    {
        await SeedBranchAsync();
        await SeedActorAsync();
        Table t1 = await SeedEmptyTableAsync(Teras, "T1");

        var result = await new CreateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser).Handle(new CreateUserCommand
        {
            FullName = "Yeni Kasiyer",
            UserName = "kasiyer1",
            PasswordHash = "123456",
            Role = UserRole.Cashier,
            RegionIds = [Salon.Id, Teras.Id],
            RestrictedRegionIds = [Teras.Id],
            TableIds = [t1.Id],
        }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        UserBranch membership = Assert.Single(DbContext.UserBranches.Where(ub => ub.UserName == "kasiyer1"));
        Assert.Equal(new[] { Salon.Id, Teras.Id }.Order(), membership.RegionIds.Order());
        Assert.Equal([Teras.Id], membership.RestrictedRegionIds);
        Assert.Equal([t1.Id], membership.TableIds);
    }

    // Garson ↔ kasiyer geçişinde bölge ve masa seçimi korunur; mutfağa geçişte temizlenir, geri dönünce gelmez.
    [Fact]
    public async Task UpdateUser_RoleChange_WaiterAndCashierKeepRegions_KitchenClearsThem()
    {
        await SeedBranchAsync();
        await SeedActorAsync();
        Table t1 = await SeedEmptyTableAsync(Teras, "T1");
        FakeCurrentUserService waiter = await SeedWaiterAsync(regionIds: [Salon.Id, Teras.Id]);
        UserBranch membership = Assert.Single(DbContext.UserBranches.Where(ub => ub.UserId == waiter.UserId));
        membership.SetTableRestriction([Teras.Id], [t1.Id]);
        await DbContext.SaveChangesAsync();
        var handler = new UpdateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);
        UpdateUserCommand Command(UserRole role) => new() { UserId = waiter.UserId, FullName = "Personel", UserName = membership.UserName, Role = role };

        // Form bölge alanlarını göndermese de (null = değiştirme) kasiyere geçişte seçim kalır.
        var toCashier = await handler.Handle(Command(UserRole.Cashier), CancellationToken.None);
        Assert.True(toCashier.IsSuccess, toCashier.Error);
        Assert.Equal(new[] { Salon.Id, Teras.Id }.Order(), membership.RegionIds.Order());
        Assert.Equal([Teras.Id], membership.RestrictedRegionIds);
        Assert.Equal([t1.Id], membership.TableIds);
        FakeCurrentUserService asCashier = new() { UserId = waiter.UserId, Role = "Cashier", BranchId = Branch.Id, CompanyId = CurrentUser.CompanyId };
        Assert.NotNull((await Db.GetStaffAccessAsync(asCashier, CancellationToken.None)).WaiterScope);

        var backToWaiter = await handler.Handle(Command(UserRole.Waiter), CancellationToken.None);
        Assert.True(backToWaiter.IsSuccess, backToWaiter.Error);
        Assert.Equal([t1.Id], membership.TableIds);

        var toKitchen = await handler.Handle(Command(UserRole.Kitchen), CancellationToken.None);
        Assert.True(toKitchen.IsSuccess, toKitchen.Error);
        Assert.Empty(membership.RegionIds);
        Assert.Empty(membership.RestrictedRegionIds);
        Assert.Empty(membership.TableIds);

        var toCashierAgain = await handler.Handle(Command(UserRole.Cashier), CancellationToken.None);
        Assert.True(toCashierAgain.IsSuccess, toCashierAgain.Error);
        Assert.Empty(membership.RegionIds);
    }
}
