using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Features.Delivery.Staff;
using RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder;
using RestaurantBill.Application.Features.Orders.Commands.AddSetMenuToOrder;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.Delivery;

// Yola çıkmış paket siparişe ürün/menü eklenemez (kasadaki "Teslim al" tutar farkıyla durmasın diye) ve mutfak siparişi
// hazır deyince atanmış kuryenin ekranı canlı yenilenir. Sipariş: 2 Lahmacun (₺200) + ₺20 teslimat.
public class DispatchedDeliveryTests : DeliveryTestBase
{
    private async Task<User> SeedCourierAsync()
    {
        User courier = User.Create("Kurye Kaan", $"{Guid.NewGuid():N}@test.com", "5550000000");
        DbContext.Users.Add(courier);
        DbContext.UserBranches.Add(UserBranch.Create(courier, Branch, "kurye.kaan", null, UserRole.Courier));
        await DbContext.SaveChangesAsync();
        return courier;
    }

    private async Task AssignAsync(DeliveryOrder delivery, User courier)
    {
        Result assigned = await new AssignCourierCommandHandler(Db, CurrentUser, CashierNotifications, CourierNotifications)
            .Handle(new AssignCourierCommand { Id = delivery.Id, CourierUserId = courier.Id }, CancellationToken.None);
        Assert.True(assigned.IsSuccess, assigned.Error);
    }

    private Task<Result> MarkReadyAsync(DeliveryOrder delivery)
        => new UpdateOrderStatusCommandHandler(Db, TableNotifications, CashierNotifications, CurrentUser, CourierNotifications)
            .Handle(new UpdateOrderStatusCommand { OrderId = delivery.OrderId!.Value, Status = (int)OrderStatus.Ready }, CancellationToken.None);

    private Task<Result> AddLahmacunAsync(DeliveryOrder delivery)
        => new AddProductToOrderCommandHandler(Db, TableNotifications, CashierNotifications, CurrentUser)
            .Handle(new AddProductToOrderCommand
            {
                OrderId = delivery.OrderId!.Value,
                OrderItems = [new CreateOrderItemDto { ProductId = Lahmacun.Id, Quantity = 1 }]
            }, CancellationToken.None);

    private Task<Result<Guid>> AddMenuAsync(DeliveryOrder delivery)
        => new AddSetMenuToOrderCommandHandler(Db, TableNotifications, CashierNotifications, CurrentUser)
            .Handle(new AddSetMenuToOrderCommand { OrderId = delivery.OrderId!.Value, SetMenuId = AdanaMenu.Id, Quantity = 1 }, CancellationToken.None);

    private async Task<DeliveryOrder> ReadyWithCourierAsync(User courier)
    {
        DeliveryOrder delivery = await SubmitOkAsync();
        await AcceptOkAsync(delivery);
        await AssignAsync(delivery, courier);
        Result ready = await MarkReadyAsync(delivery);
        Assert.True(ready.IsSuccess, ready.Error);
        Assert.Equal(DeliveryOrderStatus.Ready, delivery.Status);
        return delivery;
    }

    [Fact]
    public async Task KitchenReady_NotifiesAssignedCourier()
    {
        await SeedAsync();
        User courier = await SeedCourierAsync();
        DeliveryOrder delivery = await SubmitOkAsync();
        await AcceptOkAsync(delivery);
        await AssignAsync(delivery, courier);
        CourierNotifications.Sent.Clear();

        Result ready = await MarkReadyAsync(delivery);

        Assert.True(ready.IsSuccess, ready.Error);
        Assert.Equal(DeliveryOrderStatus.Ready, delivery.Status);
        Assert.Contains(CourierNotifications.Sent, s => s.BranchId == Branch.Id && s.CourierUserId == courier.Id && s.DeliveryOrderId == delivery.Id);
    }

    [Fact]
    public async Task KitchenReady_WithoutCourier_SendsNoCourierEvent()
    {
        await SeedAsync();
        DeliveryOrder delivery = await SubmitOkAsync();
        await AcceptOkAsync(delivery);

        Result ready = await MarkReadyAsync(delivery);

        Assert.True(ready.IsSuccess, ready.Error);
        Assert.Empty(CourierNotifications.Sent);
    }

    [Fact]
    public async Task AddItems_BeforeDispatch_Succeeds()
    {
        await SeedAsync();
        User courier = await SeedCourierAsync();
        DeliveryOrder delivery = await ReadyWithCourierAsync(courier);

        Result result = await AddLahmacunAsync(delivery);

        Assert.True(result.IsSuccess, result.Error);
    }

    [Fact]
    public async Task AddProductAndSetMenu_AfterDispatch_AreRejected()
    {
        await SeedAsync();
        User courier = await SeedCourierAsync();
        DeliveryOrder delivery = await ReadyWithCourierAsync(courier);
        Result dispatched = await new DispatchDeliveryOrderCommandHandler(Db, CurrentUser, CashierNotifications, CourierNotifications, Clock)
            .Handle(new DispatchDeliveryOrderCommand { Id = delivery.Id }, CancellationToken.None);
        Assert.True(dispatched.IsSuccess, dispatched.Error);
        Order order = DbContext.Orders.Single(o => o.Id == delivery.OrderId);
        decimal totalBefore = order.TotalPrice;

        Result product = await AddLahmacunAsync(delivery);
        Result<Guid> menu = await AddMenuAsync(delivery);

        Assert.Equal(DeliveryKitchenSync.DispatchedAddItemsMessage, product.Error);
        Assert.Equal(DeliveryKitchenSync.DispatchedAddItemsMessage, menu.Error);
        Assert.Equal(totalBefore, order.TotalPrice);
    }
}
