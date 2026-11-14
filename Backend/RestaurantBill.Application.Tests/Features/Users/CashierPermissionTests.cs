using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Orders.Commands.TransferOrder;
using RestaurantBill.Application.Features.Orders.Queries;
using RestaurantBill.Application.Features.Payments.Commands.CreatePayment;
using RestaurantBill.Application.Features.Users.Commands.CreateUser;
using RestaurantBill.Application.Features.Users.Commands.UpdateUser;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Features.Waiter;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.Users;

// Kasiyer yetkileri: indirim/ikram, indirim sınırı ve masa taşıma. Admin/Owner bu kısıtlara takılmaz.
public class CashierPermissionTests : WaiterTestBase
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

    // Kasiyerin (ya da admin'in) kendi günü açık kasası ve 400 TL'lik bir masa siparişi.
    private async Task<(Order Order, CashRegister Register)> SeedBillAsync(FakeCurrentUserService user)
    {
        var (register, _) = await SeedRegisterAsync("Ana Kasa", user.UserId);
        Order order = await SeedOrderAsync(Salon);
        return (order, register);
    }

    private Task<Result<bool>> PayAsync(FakeCurrentUserService user, Order order, CashRegister register,
        decimal? discountPercent = null, decimal? discountAmount = null) =>
        new CreatePaymentCommandHandler(Db, new FakeTableNotificationService(), new FakeCashierNotificationService(), user)
            .Handle(new CreatePaymentCommand
            {
                OrderId = order.Id,
                CashRegisterId = register.Id,
                PaymentMethod = PaymentMethod.Kart,
                Items = order.OrderItems.Select(i => new PaymentItemDto { OrderItemId = i.Id, Quantity = i.Quantity }).ToList(),
                DiscountPercent = discountPercent,
                DiscountAmount = discountAmount,
            }, CancellationToken.None);

    private Task<Result<bool>> TransferAsync(FakeCurrentUserService user, Order order, Table destination) =>
        new TransferOrderCommandHandler(Db, new OrderQueries(Db), new FakeTableNotificationService(), new FakeCashierNotificationService(), user)
            .Handle(new TransferOrderCommand { SourceTableId = order.TableId!.Value, DestinationTableId = destination.Id, Mode = TableTransferMode.Move }, CancellationToken.None);

    private async Task<Table> SeedEmptyTableAsync()
    {
        Table table = Table.Create("Masa 9", "", Salon.Id);
        DbContext.Tables.Add(table);
        await DbContext.SaveChangesAsync();
        return table;
    }

    [Fact]
    public async Task Cashier_WithDefaultPermissions_CanApplyDiscount()
    {
        await SeedBranchAsync();
        FakeCurrentUserService cashier = await SeedCashierAsync();
        var (order, register) = await SeedBillAsync(cashier);

        var result = await PayAsync(cashier, order, register, discountPercent: 50m);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(200m, await DbContext.Payments.SumAsync(p => p.TotalAmount));
    }

    [Fact]
    public async Task Cashier_WithoutDiscountPermission_CannotApplyDiscount()
    {
        await SeedBranchAsync();
        FakeCurrentUserService cashier = await SeedCashierAsync(m => m.SetCashierPermissions(false, 100, true));
        var (order, register) = await SeedBillAsync(cashier);

        var result = await PayAsync(cashier, order, register, discountAmount: 50m);

        Assert.False(result.IsSuccess);
        Assert.Equal(StaffAccess.DeniedMessage(CashierPermission.ApplyDiscount), result.Error);
        Assert.Empty(DbContext.Payments);
    }

    [Fact]
    public async Task Cashier_WithoutDiscountPermission_CanStillTakeFullPayment()
    {
        await SeedBranchAsync();
        FakeCurrentUserService cashier = await SeedCashierAsync(m => m.SetCashierPermissions(false, 100, true));
        var (order, register) = await SeedBillAsync(cashier);

        var result = await PayAsync(cashier, order, register);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(400m, await DbContext.Payments.SumAsync(p => p.TotalAmount));
    }

    [Fact]
    public async Task Cashier_DiscountAboveLimit_IsRejected_ByPercentAndByAmount()
    {
        await SeedBranchAsync();
        FakeCurrentUserService cashier = await SeedCashierAsync(m => m.SetCashierPermissions(true, 10, true));
        var (order, register) = await SeedBillAsync(cashier);

        var byPercent = await PayAsync(cashier, order, register, discountPercent: 20m);
        var byAmount = await PayAsync(cashier, order, register, discountAmount: 41m); // 400 TL'nin %10'u 40 TL

        Assert.False(byPercent.IsSuccess);
        Assert.Equal(StaffAccess.DiscountLimitMessage(10), byPercent.Error);
        Assert.False(byAmount.IsSuccess);
        Assert.Equal(StaffAccess.DiscountLimitMessage(10), byAmount.Error);
        Assert.Empty(DbContext.Payments);
    }

    [Fact]
    public async Task Cashier_DiscountAtLimit_IsAllowed()
    {
        await SeedBranchAsync();
        FakeCurrentUserService cashier = await SeedCashierAsync(m => m.SetCashierPermissions(true, 10, true));
        var (order, register) = await SeedBillAsync(cashier);

        var result = await PayAsync(cashier, order, register, discountAmount: 40m);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(360m, await DbContext.Payments.SumAsync(p => p.TotalAmount));
    }

    [Fact]
    public async Task Admin_BypassesCashierDiscountRules()
    {
        await SeedBranchAsync();
        await SeedActorAsync();
        var (order, register) = await SeedBillAsync(CurrentUser);

        var result = await PayAsync(CurrentUser, order, register, discountPercent: 100m);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(0m, await DbContext.Payments.SumAsync(p => p.TotalAmount));
    }

    [Fact]
    public async Task Cashier_WithoutTransferPermission_CannotMoveTable()
    {
        await SeedBranchAsync();
        FakeCurrentUserService cashier = await SeedCashierAsync(m => m.SetCashierPermissions(true, 100, false));
        Order order = await SeedOrderAsync(Salon);
        Table destination = await SeedEmptyTableAsync();
        Guid sourceTableId = order.TableId!.Value;

        var result = await TransferAsync(cashier, order, destination);

        Assert.False(result.IsSuccess);
        Assert.Equal(StaffAccess.DeniedMessage(CashierPermission.TransferTables), result.Error);
        Assert.Equal(sourceTableId, order.TableId);
    }

    [Fact]
    public async Task Cashier_WithDefaultPermissions_CanMoveTable()
    {
        await SeedBranchAsync();
        FakeCurrentUserService cashier = await SeedCashierAsync();
        Order order = await SeedOrderAsync(Salon);
        Table destination = await SeedEmptyTableAsync();

        var result = await TransferAsync(cashier, order, destination);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(destination.Id, order.TableId);
    }

    [Fact]
    public async Task Admin_CanMoveTable_WithoutCashierPermission()
    {
        await SeedBranchAsync();
        await SeedActorAsync();
        Order order = await SeedOrderAsync(Salon);
        Table destination = await SeedEmptyTableAsync();

        var result = await TransferAsync(CurrentUser, order, destination);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(destination.Id, order.TableId);
    }

    [Fact]
    public async Task CreateUser_NewCashier_GetsAllCashierPermissionsByDefault()
    {
        await SeedBranchAsync();
        await SeedActorAsync();

        var result = await new CreateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser).Handle(new CreateUserCommand
        {
            FullName = "Yeni Kasiyer",
            UserName = "kasiyer1",
            PasswordHash = "123456",
            Role = UserRole.Cashier
        }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        UserBranch membership = Assert.Single(DbContext.UserBranches.Where(ub => ub.UserName == "kasiyer1"));
        Assert.True(membership.CanApplyDiscount);
        Assert.Equal(100, membership.MaxDiscountPercent);
        Assert.True(membership.CanTransferTables);
    }

    [Fact]
    public async Task UpdateUser_SetsCashierPermissions_AndRejectsInvalidDiscountLimit()
    {
        await SeedBranchAsync();
        await SeedActorAsync();
        FakeCurrentUserService cashier = await SeedCashierAsync();
        var handler = new UpdateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);
        UserBranch membership = Assert.Single(DbContext.UserBranches.Where(ub => ub.UserId == cashier.UserId));

        var updated = await handler.Handle(new UpdateUserCommand
        {
            UserId = cashier.UserId, FullName = "Ayşe Kasiyer", UserName = membership.UserName, Role = UserRole.Cashier,
            CanApplyDiscount = true, MaxDiscountPercent = 15, CanTransferTables = false
        }, CancellationToken.None);
        var invalid = await handler.Handle(new UpdateUserCommand
        {
            UserId = cashier.UserId, FullName = "Ayşe Kasiyer", UserName = membership.UserName, Role = UserRole.Cashier,
            MaxDiscountPercent = 0
        }, CancellationToken.None);

        Assert.True(updated.IsSuccess, updated.Error);
        Assert.False(invalid.IsSuccess);
        Assert.True(membership.CanApplyDiscount);
        Assert.Equal(15, membership.MaxDiscountPercent);
        Assert.False(membership.CanTransferTables);
    }
}
