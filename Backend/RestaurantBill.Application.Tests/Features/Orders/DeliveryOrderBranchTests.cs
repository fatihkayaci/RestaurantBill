using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Orders.Commands.CancelOrder;
using RestaurantBill.Application.Features.Orders.Commands.CloseOrder;
using RestaurantBill.Application.Features.Orders.Commands.RequestBill;
using RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToCashierQuery;
using RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToKitchen;
using RestaurantBill.Application.Features.Payments.Commands.CreatePayment;
using RestaurantBill.Application.Features.Shifts.Queries.GetShiftSummary;
using RestaurantBill.Application.Features.Stats.Queries.GetDashboard;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Orders;

// Paket sipariş (masasız Order): şube sorguları onu BranchId ile bulur, masaya özgü işlemler reddeder,
// garson hiç göremez.
public class DeliveryOrderBranchTests : ApplicationTestBase
{
    private async Task<Branch> SeedBranchAsync()
    {
        Branch branch = Branch.Create(Guid.NewGuid(), "Merkez", "Y", "111", "a@mail.com", "İstanbul", "Kadıköy", "Adres", 10m);
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(branch, CurrentUser.BranchId);
        DbContext.Branches.Add(branch);
        await DbContext.SaveChangesAsync();
        return branch;
    }

    private async Task<Product> SeedProductAsync(string name = "Lahmacun", decimal price = 100m)
    {
        Product product = Product.Create(name, price, "", await DefaultCategoryIdAsync());
        DbContext.Products.Add(product);
        await DbContext.SaveChangesAsync();
        return product;
    }

    private async Task<Order> SeedDeliveryOrderAsync(decimal fee = 30m, Guid? branchId = null)
    {
        Order order = Order.CreateDelivery(branchId ?? CurrentUser.BranchId, fee);
        order.AddItemAtPrice(await SeedProductAsync(), 100m, 2, 10m);
        DbContext.Orders.Add(order);
        await DbContext.SaveChangesAsync();
        return order;
    }

    private async Task<FakeCurrentUserService> SeedStaffAsync(UserRole role)
    {
        Branch branch = await DbContext.Branches.SingleOrDefaultAsync(b => b.Id == CurrentUser.BranchId) ?? await SeedBranchAsync();
        User user = User.Create($"{role} Kullanıcı", $"{Guid.NewGuid():N}@test.com", "5551234567");
        DbContext.Users.Add(user);
        DbContext.UserBranches.Add(UserBranch.Create(user, branch, $"u{Guid.NewGuid():N}"[..12], null, role));
        await DbContext.SaveChangesAsync();
        return new FakeCurrentUserService { BranchId = CurrentUser.BranchId, CompanyId = CurrentUser.CompanyId, UserId = user.Id, Role = role.ToString() };
    }

    [Fact]
    public async Task KitchenQuery_IncludesDeliveryOrderOfTheBranch_AndNotOfOtherBranches()
    {
        Order delivery = await SeedDeliveryOrderAsync();
        await SeedDeliveryOrderAsync(branchId: Guid.NewGuid());

        var result = await new GetAllOrdersToKitchenQueryHandler(Db, CurrentUser).Handle(new GetAllOrdersToKitchenQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        var dto = Assert.Single(result.Value!);
        Assert.Equal(delivery.Id, dto.Id);
        Assert.Null(dto.TableId);
        Assert.Equal(MappingExtensions.DeliveryTableName, dto.TableName);
        Assert.Equal(OrderType.Delivery, dto.OrderType);
    }

    [Fact]
    public async Task CashierQuery_IncludesDeliveryOrder_WithUnsettledFeeInTotal()
    {
        Order delivery = await SeedDeliveryOrderAsync(fee: 30m);
        await SeedDeliveryOrderAsync(branchId: Guid.NewGuid());

        var result = await new GetAllOrdersToCashierQueryHandler(Db, CurrentUser).Handle(new GetAllOrdersToCashierQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        var dto = Assert.Single(result.Value!);
        Assert.Equal(delivery.Id, dto.Id);
        Assert.Equal(230m, dto.TotalPrice);
    }

    [Fact]
    public async Task Dashboard_CountsDeliveryOrderAsOpen_ButNotOnTheTableMap()
    {
        await SeedBranchAsync();
        Table table = await SeedTableAsync();
        table.Occupy();
        Order dineIn = Order.Create(table.Id, CurrentUser.BranchId);
        dineIn.AddItem(await SeedProductAsync("Çay", 20m), 1);
        DbContext.Orders.Add(dineIn);
        await SeedDeliveryOrderAsync();

        var result = await new GetDashboardQueryHandler(Db, CurrentUser).Handle(new GetDashboardQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(2, result.Value!.Live.OpenOrders);
        Assert.Equal(2, result.Value.Live.KitchenPending);
        var mapTable = Assert.Single(result.Value.Regions.SelectMany(r => r.Tables));
        Assert.Equal(20m, mapTable.ActiveOrderTotal);
    }

    [Fact]
    public async Task Dashboard_SplitsTodayRevenuePerMethod_IncludingDeliveryFeeAndOnAccount()
    {
        Branch branch = await SeedBranchAsync();
        CashRegister register = CashRegister.Create("Ana Kasa", 0m, branch.Id);
        DbContext.CashRegisters.Add(register);
        Order order = await SeedDeliveryOrderAsync();
        DbContext.Payments.AddRange(
            Payment.Create(order.Id, register.Id, 100m, 90.91m, 9.09m, PaymentMethod.Nakit, 1, taxRate: 10m),
            Payment.Create(order.Id, register.Id, 30m, 25m, 5m, PaymentMethod.Nakit, 0, taxRate: 20m, isDeliveryFee: true),
            Payment.Create(order.Id, register.Id, 40m, 36.36m, 3.64m, PaymentMethod.Kart, 0, taxRate: 10m, isOnAccount: true),
            Payment.Create(order.Id, register.Id, 25m, 22.73m, 2.27m, PaymentMethod.Qr, 1, taxRate: 10m),
            Payment.Create(order.Id, register.Id, 15m, 13.64m, 1.36m, PaymentMethod.Iban, 1, taxRate: 10m));
        await DbContext.SaveChangesAsync();

        var result = await new GetDashboardQueryHandler(Db, CurrentUser).Handle(new GetDashboardQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        var revenue = result.Value!.Revenue;
        Assert.Equal(130m, revenue.Cash);
        Assert.Equal(40m, revenue.Card);
        Assert.Equal(25m, revenue.Qr);
        Assert.Equal(15m, revenue.Iban);
        Assert.Equal(40m, revenue.Other);
        Assert.Equal(210m, revenue.Today);
    }

    [Fact]
    public async Task ShiftSummary_SeesDeliveryOrderThroughBranch_ButDoesNotCountItAsATable()
    {
        Branch branch = await SeedBranchAsync();
        CashRegister register = CashRegister.Create("Ana Kasa", 0m, branch.Id);
        DbContext.CashRegisters.Add(register);
        Shift shift = Shift.Create(branch.Id, register.Id, CurrentUser.UserId, 0m, 0m);
        DbContext.Shifts.Add(shift);
        Table table = await SeedTableAsync();
        DbContext.Orders.Add(Order.Create(table.Id, CurrentUser.BranchId));
        Order delivery = await SeedDeliveryOrderAsync();
        DbContext.Payments.Add(Payment.Create(delivery.Id, register.Id, 30m, 25m, 5m, PaymentMethod.Nakit, 0,
            shiftId: shift.Id, taxRate: 20m, isDeliveryFee: true));
        await DbContext.SaveChangesAsync();

        var result = await new GetShiftSummaryQueryHandler(Db, CurrentUser, new ZeroBalanceCalculator())
            .Handle(new GetShiftSummaryQuery { ShiftId = shift.Id }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(1, result.Value!.OpenTablesCount);
        Assert.Equal(30m, Assert.Single(result.Value.Breakdown).Amount);
    }

    [Fact]
    public async Task TableOnlyCommands_RejectDeliveryOrder()
    {
        await SeedActorAsync();
        Order delivery = await SeedDeliveryOrderAsync();
        var tables = new FakeTableNotificationService();
        var cashier = new FakeCashierNotificationService();

        var requestBill = await new RequestBillCommandHandler(Db, tables, cashier, CurrentUser)
            .Handle(new RequestBillCommand { OrderId = delivery.Id }, CancellationToken.None);
        var cancel = await new CancelOrderCommandHandler(Db, tables, cashier, CurrentUser)
            .Handle(new CancelOrderCommand { OrderId = delivery.Id }, CancellationToken.None);
        var close = await new CloseOrderCommandHandler(Db, tables, cashier, CurrentUser)
            .Handle(new DeleteCommand { OrderId = delivery.Id }, CancellationToken.None);
        var pay = await new CreatePaymentCommandHandler(Db, tables, cashier, CurrentUser)
            .Handle(new CreatePaymentCommand { OrderId = delivery.Id, CashRegisterId = Guid.NewGuid(), PaymentMethod = PaymentMethod.Nakit }, CancellationToken.None);

        Assert.All([requestBill.Error, cancel.Error, close.Error, pay.Error], error => Assert.Equal(Order.TableOnlyMessage, error));
        Order reloaded = await DbContext.Orders.AsNoTracking().SingleAsync(o => o.Id == delivery.Id);
        Assert.Equal(OrderStatus.Pending, reloaded.Status);
        Assert.Null(reloaded.BillRequestedAt);
    }

    [Fact]
    public async Task Waiter_CannotReachDeliveryOrders_EvenWithoutRegionScope()
    {
        Order delivery = await SeedDeliveryOrderAsync();
        Table table = await SeedTableAsync();
        DbContext.Orders.Add(Order.Create(table.Id, CurrentUser.BranchId));
        await DbContext.SaveChangesAsync();
        StaffAccess waiter = await Db.GetStaffAccessAsync(await SeedStaffAsync(UserRole.Waiter), CancellationToken.None);
        StaffAccess cashier = await Db.GetStaffAccessAsync(await SeedStaffAsync(UserRole.Cashier), CancellationToken.None);

        Assert.Equal(StaffAccess.DeliveryDeniedMessage, await Db.CheckOrderAccessAsync(waiter, delivery, null, CancellationToken.None));
        Assert.Null(await Db.CheckOrderAccessAsync(cashier, delivery, null, CancellationToken.None));
        Assert.Single(await Db.Orders.InStaffRegions(waiter).ToListAsync());
        Assert.Equal(2, await Db.Orders.InStaffRegions(cashier).CountAsync());
    }

    private sealed class ZeroBalanceCalculator : IShiftBalanceCalculator
    {
        public Task<decimal> CalculateExpectedClosingBalanceAsync(Shift shift, CancellationToken cancellationToken) => Task.FromResult(0m);
    }
}
