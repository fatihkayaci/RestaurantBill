using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Orders.Commands.CancelOrderItem;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Application.Tests.Features.Orders;

// Ürün bazlı (adetli) iptal: satırın bir kısmı ya da tamamı; yetki ve işlem kaydı siparişin tamamının iptaliyle aynı.
public class CancelOrderItemHandlerTests : ApplicationTestBase
{
    private readonly FakeCashierNotificationService _cashier = new();

    private CancelOrderItemCommandHandler Handler(FakeCurrentUserService? user = null) =>
        new(Db, new FakeTableNotificationService(), _cashier, user ?? CurrentUser);

    private async Task<(Order Order, OrderItem Line)> SeedOrderAsync(int quantity = 3, decimal price = 30m)
    {
        Table table = await SeedTableAsync();
        table.Occupy();
        Order order = Order.Create(table.Id, CurrentUser.BranchId);
        Product product = Product.Create("Ayran", price, "", await DefaultCategoryIdAsync());
        order.AddItem(product, quantity);
        DbContext.Orders.Add(order);
        await DbContext.SaveChangesAsync();
        await SeedActorAsync();
        return (order, order.OrderItems.Single());
    }

    [Fact]
    public async Task Handle_PartialQuantity_ReducesLine_WritesAuditLog_NotifiesCashier()
    {
        var (order, line) = await SeedOrderAsync();

        var result = await Handler().Handle(new CancelOrderItemCommand { OrderId = order.Id, OrderItemId = line.Id, Quantity = 1, Reason = "Müşteri vazgeçti" }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, DbContext.OrderItems.Single().Quantity);
        Assert.Equal(60m, order.TotalPrice);
        AuditLog log = DbContext.AuditLogs.Single();
        Assert.Equal("OrderItemCancelled", log.Action);
        Assert.Contains("1 adet Ayran", log.Message);
        Assert.Contains("Müşteri vazgeçti", log.Message);
        Assert.Equal(1, _cashier.OrdersChangedCount);
    }

    [Fact]
    public async Task Handle_AllQuantity_RemovesLine()
    {
        var (order, line) = await SeedOrderAsync();

        var result = await Handler().Handle(new CancelOrderItemCommand { OrderId = order.Id, OrderItemId = line.Id, Quantity = 3 }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(DbContext.OrderItems.ToList());
        Assert.Equal(0m, order.TotalPrice);
        Assert.Equal(OrderStatus.Pending, order.Status);
    }

    [Fact]
    public async Task Handle_MoreThanLineQuantity_Throws_AndKeepsLine()
    {
        var (order, line) = await SeedOrderAsync();

        await Assert.ThrowsAsync<DomainException>(() =>
            Handler().Handle(new CancelOrderItemCommand { OrderId = order.Id, OrderItemId = line.Id, Quantity = 4 }, CancellationToken.None));

        Assert.Equal(3, DbContext.OrderItems.Single().Quantity);
        Assert.Empty(DbContext.AuditLogs.ToList());
    }

    [Fact]
    public async Task Handle_ClosedOrder_Throws()
    {
        var (order, line) = await SeedOrderAsync();
        order.Close();
        await DbContext.SaveChangesAsync();

        await Assert.ThrowsAsync<DomainException>(() =>
            Handler().Handle(new CancelOrderItemCommand { OrderId = order.Id, OrderItemId = line.Id, Quantity = 1 }, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_PaidUnits_CannotBeCancelled()
    {
        var (order, line) = await SeedOrderAsync();
        order.SettleItem(line.Id, 2);
        await DbContext.SaveChangesAsync();

        await Assert.ThrowsAsync<DomainException>(() =>
            Handler().Handle(new CancelOrderItemCommand { OrderId = order.Id, OrderItemId = line.Id, Quantity = 2 }, CancellationToken.None));
        Assert.Equal(1, DbContext.OrderItems.Single().Quantity);
    }

    [Fact]
    public async Task Handle_WaiterWithoutCancelPermission_IsDenied()
    {
        var (order, line) = await SeedOrderAsync();
        Branch branch = Branch.Create("Test Restoran");
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(branch, CurrentUser.BranchId);
        DbContext.Branches.Add(branch);
        User user = User.Create("Garson", "", "");
        DbContext.Users.Add(user);
        // Yeni garson varsayılanı: yalnızca sipariş alma.
        DbContext.UserBranches.Add(UserBranch.Create(user, branch, $"p{Guid.NewGuid():N}"[..10], null, UserRole.Waiter));
        await DbContext.SaveChangesAsync();
        var waiter = new FakeCurrentUserService { BranchId = CurrentUser.BranchId, CompanyId = CurrentUser.CompanyId, UserId = user.Id, Role = nameof(UserRole.Waiter) };

        var result = await Handler(waiter).Handle(new CancelOrderItemCommand { OrderId = order.Id, OrderItemId = line.Id, Quantity = 1 }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(StaffAccess.DeniedMessage(WaiterPermission.CancelAndDiscount), result.Error);
        Assert.Equal(3, DbContext.OrderItems.Single().Quantity);
    }

    [Fact]
    public void Validator_RejectsZeroQuantity()
    {
        var validation = new CancelOrderItemCommandValidator().Validate(new CancelOrderItemCommand { OrderId = Guid.NewGuid(), OrderItemId = Guid.NewGuid(), Quantity = 0 });

        Assert.False(validation.IsValid);
    }
}
