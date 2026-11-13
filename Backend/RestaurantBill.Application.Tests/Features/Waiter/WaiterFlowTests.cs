using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Orders.Commands.RequestBill;
using RestaurantBill.Application.Features.Payments.Commands.CreatePayment;
using RestaurantBill.Application.Features.Shifts.Queries.GetOpenRegisters;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.Waiter;

// Garson ekranının sunucu tarafı: açık kasaları listeleme, seçilen kasaya ödeme ve "Hesap iste".
public abstract class WaiterTestBase : ApplicationTestBase
{
    protected Branch Branch = default!;
    protected Region Salon = default!;
    protected Region Teras = default!;
    protected Product Product = default!;

    protected async Task SeedBranchAsync()
    {
        Branch = Branch.Create(Guid.NewGuid(), "Merkez", "Y", "111", "a@mail.com", "İstanbul", "Kadıköy", "Adres", 10m);
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(Branch, CurrentUser.BranchId);
        DbContext.Branches.Add(Branch);
        Salon = Region.Create("Salon", Branch.Id);
        Teras = Region.Create("Teras", Branch.Id);
        DbContext.Regions.AddRange(Salon, Teras);
        Category category = Category.Create("Ana Yemek", Branch.Id);
        DbContext.Categories.Add(category);
        Product = Product.Create("Köfte", 200m, "", category.Id);
        DbContext.Products.Add(Product);
        await DbContext.SaveChangesAsync();
    }

    protected async Task<Branch> SeedOtherBranchAsync()
    {
        Branch other = Branch.Create(Guid.NewGuid(), "Diğer", "Y", "111", "b@mail.com", "İstanbul", "Kadıköy", "Adres", 10m);
        DbContext.Branches.Add(other);
        await DbContext.SaveChangesAsync();
        return other;
    }

    protected async Task<FakeCurrentUserService> SeedWaiterAsync(
        string name = "Mehmet Garson", bool canTakePayment = true, IEnumerable<Guid>? regionIds = null)
    {
        User waiter = User.Create(name, $"{Guid.NewGuid():N}@test.com", "5550000000");
        DbContext.Users.Add(waiter);
        UserBranch membership = UserBranch.Create(waiter, Branch, "garson" + Guid.NewGuid().ToString("N")[..6], null, UserRole.Waiter);
        membership.SetWaiterPermissions(true, canTakePayment, false, false);
        membership.SetRegions(regionIds);
        DbContext.UserBranches.Add(membership);
        await DbContext.SaveChangesAsync();
        return new FakeCurrentUserService { UserId = waiter.Id, Role = "Waiter", BranchId = Branch.Id, CompanyId = CurrentUser.CompanyId };
    }

    protected async Task<Order> SeedOrderAsync(Region region, string tableName = "Masa 3")
    {
        Table table = Table.Create(tableName, "", region.Id);
        table.Occupy();
        DbContext.Tables.Add(table);
        Order order = Order.Create(table.Id);
        order.AddItem(Product, 2, 10m);
        DbContext.Orders.Add(order);
        await DbContext.SaveChangesAsync();
        return order;
    }

    protected async Task<(CashRegister Register, Shift? Shift)> SeedRegisterAsync(string name, Guid? shiftOwnerId, Guid? branchId = null)
    {
        CashRegister register = CashRegister.Create(name, 100m, branchId ?? Branch.Id);
        DbContext.CashRegisters.Add(register);
        Shift? shift = null;
        if (shiftOwnerId is { } ownerId)
        {
            shift = Shift.Create(branchId ?? Branch.Id, register.Id, ownerId, 100m, 100m);
            DbContext.Shifts.Add(shift);
        }
        await DbContext.SaveChangesAsync();
        return (register, shift);
    }
}

public class OpenRegistersTests : WaiterTestBase
{
    private Task<Result<List<OpenRegisterDto>>> ListAsync(FakeCurrentUserService user) =>
        new GetOpenRegistersQueryHandler(Db, user).Handle(new GetOpenRegistersQuery(), CancellationToken.None);

    [Fact]
    public async Task Waiter_WithPaymentPermission_SeesOnlyRegistersWithOpenShift_AndDayOwner()
    {
        await SeedBranchAsync();
        User cashier = await SeedActorAsync("Ayşe Kasiyer", Guid.NewGuid());
        await SeedRegisterAsync("Ana Kasa", cashier.Id);
        await SeedRegisterAsync("Bar Kasa", shiftOwnerId: null);
        Branch other = await SeedOtherBranchAsync();
        await SeedRegisterAsync("Başka Şube Kasa", cashier.Id, other.Id);
        FakeCurrentUserService waiter = await SeedWaiterAsync();

        var result = await ListAsync(waiter);

        Assert.True(result.IsSuccess, result.Error);
        OpenRegisterDto register = Assert.Single(result.Value!);
        Assert.Equal("Ana Kasa", register.CashRegisterName);
        Assert.Equal("Ayşe Kasiyer", register.ShiftOwnerName);
    }

    [Fact]
    public async Task Waiter_WithoutPaymentPermission_IsDenied()
    {
        await SeedBranchAsync();
        await SeedRegisterAsync("Ana Kasa", Guid.NewGuid());
        FakeCurrentUserService waiter = await SeedWaiterAsync(canTakePayment: false);

        var result = await ListAsync(waiter);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Cashier_CanList()
    {
        await SeedBranchAsync();
        await SeedRegisterAsync("Ana Kasa", Guid.NewGuid());
        var cashier = new FakeCurrentUserService { Role = "Cashier", BranchId = Branch.Id };

        var result = await ListAsync(cashier);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Single(result.Value!);
    }
}

public class WaiterPaymentTests : WaiterTestBase
{
    private Task<Result<bool>> PayAsync(FakeCurrentUserService user, Order order, CashRegister register) =>
        new CreatePaymentCommandHandler(Db, new FakeTableNotificationService(), new FakeCashierNotificationService(), user)
            .Handle(new CreatePaymentCommand
            {
                OrderId = order.Id,
                CashRegisterId = register.Id,
                PaymentMethod = PaymentMethod.Nakit,
                Items = order.OrderItems.Select(i => new PaymentItemDto { OrderItemId = i.Id, Quantity = i.Quantity }).ToList(),
            }, CancellationToken.None);

    [Fact]
    public async Task Waiter_PaysToChosenRegister_RecordedOnThatShift_WithWaiterAsPayer()
    {
        await SeedBranchAsync();
        await SeedRegisterAsync("Ana Kasa", Guid.NewGuid());
        var (teras, terasShift) = await SeedRegisterAsync("Teras Kasa", Guid.NewGuid());
        FakeCurrentUserService waiter = await SeedWaiterAsync();
        Order order = await SeedOrderAsync(Salon);
        order.RequestBill(DateTime.UtcNow);
        await DbContext.SaveChangesAsync();

        var result = await PayAsync(waiter, order, teras);

        Assert.True(result.IsSuccess, result.Error);
        Assert.True(result.Value);
        Payment payment = await DbContext.Payments.SingleAsync();
        Assert.Equal(teras.Id, payment.CashRegisterId);
        Assert.Equal(terasShift!.Id, payment.ShiftId);
        Assert.Equal(waiter.UserId, payment.UserId);
        Order paid = await DbContext.Orders.SingleAsync();
        Assert.Equal(OrderStatus.Paid, paid.Status);
        Assert.Null(paid.BillRequestedAt);
        Assert.Equal(500m, (await DbContext.CashRegisters.SingleAsync(r => r.Id == teras.Id)).Balance);
    }

    [Fact]
    public async Task Waiter_RegisterWithoutOpenShift_Fails()
    {
        await SeedBranchAsync();
        var (closed, _) = await SeedRegisterAsync("Bar Kasa", shiftOwnerId: null);
        FakeCurrentUserService waiter = await SeedWaiterAsync();
        Order order = await SeedOrderAsync(Salon);

        var result = await PayAsync(waiter, order, closed);

        Assert.False(result.IsSuccess);
        Assert.Contains("açık gün yok", result.Error);
        Assert.Empty(DbContext.Payments);
    }

    [Fact]
    public async Task Waiter_RegisterOfAnotherBranch_Fails()
    {
        await SeedBranchAsync();
        Branch other = await SeedOtherBranchAsync();
        var (foreign, _) = await SeedRegisterAsync("Başka Kasa", Guid.NewGuid(), other.Id);
        FakeCurrentUserService waiter = await SeedWaiterAsync();
        Order order = await SeedOrderAsync(Salon);

        var result = await PayAsync(waiter, order, foreign);

        Assert.False(result.IsSuccess);
        Assert.Empty(DbContext.Payments);
    }

    [Fact]
    public async Task Waiter_WithoutPaymentPermission_Fails()
    {
        await SeedBranchAsync();
        var (register, _) = await SeedRegisterAsync("Ana Kasa", Guid.NewGuid());
        FakeCurrentUserService waiter = await SeedWaiterAsync(canTakePayment: false);
        Order order = await SeedOrderAsync(Salon);

        var result = await PayAsync(waiter, order, register);

        Assert.False(result.IsSuccess);
        Assert.Empty(DbContext.Payments);
    }
}

public class RequestBillTests : WaiterTestBase
{
    private readonly FakeTableNotificationService _tables = new();
    private readonly FakeCashierNotificationService _cashier = new();

    private Task<Result> RequestAsync(FakeCurrentUserService user, Order order, bool cancel = false) =>
        new RequestBillCommandHandler(Db, _tables, _cashier, user)
            .Handle(new RequestBillCommand { OrderId = order.Id, Cancel = cancel }, CancellationToken.None);

    [Fact]
    public async Task Waiter_WithoutPaymentPermission_CanRequest_AndCashiersAreNotified()
    {
        await SeedBranchAsync();
        FakeCurrentUserService waiter = await SeedWaiterAsync("Mehmet Garson", canTakePayment: false);
        Order order = await SeedOrderAsync(Salon, "Masa 3");

        var result = await RequestAsync(waiter, order);

        Assert.True(result.IsSuccess, result.Error);
        Assert.NotNull((await DbContext.Orders.SingleAsync()).BillRequestedAt);
        var sent = Assert.Single(_cashier.BillRequestsSent);
        Assert.Equal(Branch.Id, sent.BranchId);
        Assert.Equal(order.TableId, sent.TableId);
        Assert.Equal("Masa 3", sent.TableName);
        Assert.Equal("Mehmet Garson", sent.RequestedBy);
        var change = Assert.Single(_tables.BillRequestChanges);
        Assert.NotNull(change.BillRequestedAt);
    }

    [Fact]
    public async Task Cancel_ClearsRequest_WithoutNewCashierAlert()
    {
        await SeedBranchAsync();
        FakeCurrentUserService waiter = await SeedWaiterAsync();
        Order order = await SeedOrderAsync(Salon);
        await RequestAsync(waiter, order);

        var result = await RequestAsync(waiter, order, cancel: true);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Null((await DbContext.Orders.SingleAsync()).BillRequestedAt);
        Assert.Single(_cashier.BillRequestsSent);
        Assert.Null(_tables.BillRequestChanges.Last().BillRequestedAt);
    }

    [Fact]
    public async Task Waiter_OutsideRegion_IsDenied()
    {
        await SeedBranchAsync();
        FakeCurrentUserService waiter = await SeedWaiterAsync(regionIds: [Teras.Id]);
        Order order = await SeedOrderAsync(Salon);

        var result = await RequestAsync(waiter, order);

        Assert.False(result.IsSuccess);
        Assert.Null((await DbContext.Orders.SingleAsync()).BillRequestedAt);
        Assert.Empty(_cashier.BillRequestsSent);
    }

    [Fact]
    public async Task ClosedOrder_Fails()
    {
        await SeedBranchAsync();
        FakeCurrentUserService waiter = await SeedWaiterAsync();
        Order order = await SeedOrderAsync(Salon);
        order.Cancel();
        await DbContext.SaveChangesAsync();

        var result = await RequestAsync(waiter, order);

        Assert.False(result.IsSuccess);
        Assert.Empty(_cashier.BillRequestsSent);
    }
}
