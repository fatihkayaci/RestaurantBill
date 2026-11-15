using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Features.Delivery.Public;
using RestaurantBill.Application.Features.Delivery.Staff;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemsStatus;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus;
using RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToKitchen;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.Delivery;

public class DeliveryStaffFlowTests : DeliveryTestBase
{
    private Order LinkedOrder(DeliveryOrder delivery) => DbContext.Orders.Single(o => o.Id == delivery.OrderId);

    private Task<Result> RejectAsync(DeliveryOrder order, string reason)
        => new RejectDeliveryOrderCommandHandler(Db, CurrentUser, CashierNotifications, Clock)
            .Handle(new RejectDeliveryOrderCommand { Id = order.Id, Reason = reason }, CancellationToken.None);

    private Task<Result> CancelAsync(DeliveryOrder order, string reason)
        => new CancelDeliveryOrderCommandHandler(Db, CurrentUser, CashierNotifications, KitchenNotifications, CourierNotifications, Clock)
            .Handle(new CancelDeliveryOrderCommand { Id = order.Id, Reason = reason }, CancellationToken.None);

    private Task<Result> AssignAsync(DeliveryOrder order, Guid? courierId)
        => new AssignCourierCommandHandler(Db, CurrentUser, CashierNotifications, CourierNotifications)
            .Handle(new AssignCourierCommand { Id = order.Id, CourierUserId = courierId }, CancellationToken.None);

    private async Task<User> SeedStaffAsync(string name, UserRole role, Branch branch)
    {
        User user = User.Create(name, $"{Guid.NewGuid():N}@test.com", "5550000000");
        DbContext.Users.Add(user);
        DbContext.UserBranches.Add(UserBranch.Create(user, branch, name.ToLowerInvariant().Replace(' ', '.'), null, role));
        await DbContext.SaveChangesAsync();
        return user;
    }

    // ── Kabul ───────────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Accept_CreatesDeliveryOrderAtSnapshotPricesPlusFee_AndKitchenSeesTicket()
    {
        await SeedAsync();
        var submit = await SubmitAsync(Submit(220m + 260m, ProductLine(Lahmacun, 2, "acılı"), MenuLine(Kola)));
        Assert.True(submit.IsSuccess, submit.Error);
        DeliveryOrder delivery = DbContext.DeliveryOrders.Single();

        // Müşteri gönderdikten sonra fiyat değişse de sipariş onayladığı fiyatla yazılır.
        Lahmacun.Update(Lahmacun.Name, 150m, isActive: true, Lahmacun.CategoryId);
        await DbContext.SaveChangesAsync();

        await AcceptOkAsync(delivery, eta: 35);

        Assert.Equal(DeliveryOrderStatus.Accepted, delivery.Status);
        Assert.Equal(35, delivery.EstimatedMinutes);
        Order order = LinkedOrder(delivery);
        Assert.Equal(OrderType.Delivery, order.OrderType);
        Assert.Null(order.TableId);
        Assert.Equal(Branch.Id, order.BranchId);
        Assert.Equal(20m, order.DeliveryFee);
        Assert.Equal(480m, order.TotalPrice);
        OrderItem lahmacun = order.OrderItems.Single(i => i.ProductId == Lahmacun.Id);
        Assert.Equal(100m, lahmacun.UnitPrice);
        Assert.Equal("acılı", lahmacun.Note);
        OrderItem menu = order.OrderItems.Single(i => i.IsSetMenu);
        Assert.Equal(260m, menu.UnitPrice);
        Assert.Contains(order.GetSetMenuComponents(menu), c => c.ProductId == Kola.Id);

        Assert.Contains(Branch.Id, KitchenNotifications.OrdersChanged);
        Assert.Equal(1, CashierNotifications.OrdersChangedCount);
        Assert.Equal(DeliveryOrderStatus.Accepted, CashierNotifications.DeliveryOrdersChanged.Last().Payload.Status);

        var kitchen = await new GetAllOrdersToKitchenQueryHandler(Db, CurrentUser).Handle(new GetAllOrdersToKitchenQuery(), CancellationToken.None);
        OrderDto ticket = Assert.Single(kitchen.Value!);
        Assert.Equal("PAKET #1 · Moda", ticket.TableName);
        Assert.Equal(1, ticket.DeliveryNumber);
        Assert.Equal("Moda", ticket.ZoneName);

        Assert.Contains(DbContext.AuditLogs, a => a.Action == "DeliveryOrderAccepted" && a.EntityId == delivery.Id);
    }

    [Fact]
    public async Task Accept_WithoutEta_UsesZoneEstimate()
    {
        await SeedAsync();
        DeliveryOrder delivery = await SubmitOkAsync();

        await AcceptOkAsync(delivery);

        Assert.Equal(40, delivery.EstimatedMinutes);
    }

    [Fact]
    public async Task Accept_Twice_Fails()
    {
        await SeedAsync();
        DeliveryOrder delivery = await SubmitOkAsync();
        await AcceptOkAsync(delivery);

        var again = await AcceptHandler().Handle(new AcceptDeliveryOrderCommand { Id = delivery.Id }, CancellationToken.None);

        Assert.True(again.IsFailure);
        Assert.Single(DbContext.Orders);
    }

    // ── Red ve otomatik red ─────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Reject_KeepsReasonForCustomer_AndNeverTouchesOrders()
    {
        await SeedAsync();
        DeliveryOrder delivery = await SubmitOkAsync();

        Result result = await RejectAsync(delivery, "Bölgenize şu an kurye yok");

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(DeliveryOrderStatus.Rejected, delivery.Status);
        Assert.Equal("Bölgenize şu an kurye yok", delivery.RejectReason);
        Assert.Empty(DbContext.Orders);
        Assert.Contains(DbContext.AuditLogs, a => a.Action == "DeliveryOrderRejected");
    }

    [Fact]
    public async Task AutoReject_RejectsOnlyAfterBranchTimeout()
    {
        await SeedAsync(Settings(autoRejectMinutes: 10));
        DeliveryOrder delivery = await SubmitOkAsync();
        var sweeper = new DeliveryOrderSweeper(Db, CashierNotifications);

        int early = await sweeper.AutoRejectStaleAsync(delivery.CreatedAt.AddMinutes(5), CancellationToken.None);
        Assert.Equal(0, early);
        Assert.Equal(DeliveryOrderStatus.Received, delivery.Status);

        int late = await sweeper.AutoRejectStaleAsync(delivery.CreatedAt.AddMinutes(11), CancellationToken.None);

        Assert.Equal(1, late);
        Assert.Equal(DeliveryOrderStatus.Rejected, delivery.Status);
        Assert.Equal("Restoran şu an yanıt veremedi.", delivery.RejectReason);
        Assert.Null(delivery.RejectedByUserId);
        Assert.Equal(DeliveryOrderStatus.Rejected, CashierNotifications.DeliveryOrdersChanged.Last().Payload.Status);
        Assert.Contains(DbContext.AuditLogs, a => a.Action == "DeliveryOrderAutoRejected");
    }

    // ── İptal ───────────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task StaffCancel_CascadesToLinkedOrder()
    {
        await SeedAsync();
        DeliveryOrder delivery = await SubmitOkAsync();
        await AcceptOkAsync(delivery);
        KitchenNotifications.OrdersChanged.Clear();

        Result result = await CancelAsync(delivery, "Müşteri telefonda vazgeçti");

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(DeliveryOrderStatus.Cancelled, delivery.Status);
        Assert.Equal(OrderStatus.Cancelled, LinkedOrder(delivery).Status);
        Assert.Contains(Branch.Id, KitchenNotifications.OrdersChanged);
    }

    [Fact]
    public async Task StaffCancel_OfUnansweredOrder_AsksToReject()
    {
        await SeedAsync();
        DeliveryOrder delivery = await SubmitOkAsync();

        Result result = await CancelAsync(delivery, "Neden");

        Assert.True(result.IsFailure);
        Assert.Equal(DeliveryOrderStatus.Received, delivery.Status);
    }

    [Fact]
    public async Task KitchenCannotCancelDeliveryOrderThroughOrderStatus()
    {
        await SeedAsync();
        DeliveryOrder delivery = await SubmitOkAsync();
        await AcceptOkAsync(delivery);

        var handler = new UpdateOrderStatusCommandHandler(Db, TableNotifications, CashierNotifications, CurrentUser);
        Result result = await handler.Handle(new UpdateOrderStatusCommand { OrderId = delivery.OrderId!.Value, Status = (int)OrderStatus.Cancelled }, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.NotEqual(OrderStatus.Cancelled, LinkedOrder(delivery).Status);
    }

    // ── Kurye ───────────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task AssignCourier_RequiresActiveCourierOfTheSameBranch()
    {
        await SeedAsync();
        DeliveryOrder delivery = await SubmitOkAsync();
        await AcceptOkAsync(delivery);

        Branch other = Branch.Create(Company.Id, "Beşiktaş", "", "", "", "İstanbul", "Beşiktaş", "", 10m);
        DbContext.Branches.Add(other);
        await DbContext.SaveChangesAsync();
        User foreignCourier = await SeedStaffAsync("Uzak Kurye", UserRole.Courier, other);
        User waiter = await SeedStaffAsync("Garson Gül", UserRole.Waiter, Branch);
        User courier = await SeedStaffAsync("Kurye Kaan", UserRole.Courier, Branch);

        Assert.Equal(AssignCourierCommandHandler.CourierNotInBranchMessage, (await AssignAsync(delivery, foreignCourier.Id)).Error);
        Assert.Equal(AssignCourierCommandHandler.CourierNotInBranchMessage, (await AssignAsync(delivery, waiter.Id)).Error);
        Assert.Null(delivery.CourierUserId);

        Result assigned = await AssignAsync(delivery, courier.Id);
        Assert.True(assigned.IsSuccess, assigned.Error);
        Assert.Equal(courier.Id, delivery.CourierUserId);

        Result removed = await AssignAsync(delivery, null);
        Assert.True(removed.IsSuccess, removed.Error);
        Assert.Null(delivery.CourierUserId);
    }

    [Fact]
    public async Task KitchenProgress_AdvancesDelivery_ItemsReadyGoesToOnlineOrders_ThenDispatchAndDeliver()
    {
        await SeedAsync();
        DeliveryOrder delivery = await SubmitOkAsync();
        await AcceptOkAsync(delivery);
        Order order = LinkedOrder(delivery);
        User courier = await SeedStaffAsync("Kurye Kaan", UserRole.Courier, Branch);

        var statusHandler = new UpdateOrderStatusCommandHandler(Db, TableNotifications, CashierNotifications, CurrentUser);
        Result preparing = await statusHandler.Handle(new UpdateOrderStatusCommand { OrderId = order.Id, Status = (int)OrderStatus.Preparing }, CancellationToken.None);
        Assert.True(preparing.IsSuccess, preparing.Error);
        Assert.Equal(DeliveryOrderStatus.Preparing, delivery.Status);
        Assert.Equal(DeliveryOrderStatus.Preparing, CashierNotifications.DeliveryOrdersChanged.Last().Payload.Status);

        // Kalem kalem "hazır": sipariş durumu ürünlerden türetilir.
        var itemsHandler = new UpdateOrderItemsStatusCommandHandler(Db, TableNotifications, CashierNotifications, CurrentUser);
        Result ready = await itemsHandler.Handle(new UpdateOrderItemsStatusCommand
        {
            OrderId = order.Id,
            OrderItemIds = order.OrderItems.Select(i => i.Id).ToList(),
            Status = (int)OrderItemStatus.Ready
        }, CancellationToken.None);
        Assert.True(ready.IsSuccess, ready.Error);
        Assert.Equal(DeliveryOrderStatus.Ready, delivery.Status);

        // Paket siparişin "hazır" bildirimi garsona değil, online sipariş ekranına gider.
        Assert.Empty(TableNotifications.ItemsReadySent);
        var (readyBranch, payload) = Assert.Single(TableNotifications.DeliveryItemsReadySent);
        Assert.Equal(Branch.Id, readyBranch);
        Assert.Equal("PAKET #1 · Moda", payload.TableName);
        Assert.Equal(1, payload.DeliveryNumber);

        var dispatch = new DispatchDeliveryOrderCommandHandler(Db, CurrentUser, CashierNotifications, CourierNotifications, Clock);
        Assert.True((await dispatch.Handle(new DispatchDeliveryOrderCommand { Id = delivery.Id }, CancellationToken.None)).IsFailure);
        Assert.True((await AssignAsync(delivery, courier.Id)).IsSuccess);
        Result dispatched = await dispatch.Handle(new DispatchDeliveryOrderCommand { Id = delivery.Id }, CancellationToken.None);
        Assert.True(dispatched.IsSuccess, dispatched.Error);
        Assert.Equal(DeliveryOrderStatus.OnTheWay, delivery.Status);

        Result delivered = await new DeliverDeliveryOrderCommandHandler(Db, CurrentUser, CashierNotifications, CourierNotifications, Clock)
            .Handle(new DeliverDeliveryOrderCommand { Id = delivery.Id, Method = PaymentMethod.Kart }, CancellationToken.None);
        Assert.True(delivered.IsSuccess, delivered.Error);
        Assert.Equal(DeliveryOrderStatus.Delivered, delivery.Status);
        Assert.Equal(PaymentMethod.Kart, delivery.CollectedMethod);
        Assert.Equal(220m, delivery.CollectedAmount);
        // Kart da olsa sipariş kasiyerin "Teslim al"ına kadar açık kalır (C3).
        Assert.Null(delivery.SettledAt);
        Assert.False(LinkedOrder(delivery).IsClosed());

        var couriers = await new GetCouriersQueryHandler(Db, CurrentUser).Handle(new GetCouriersQuery(), CancellationToken.None);
        CourierSummaryDto summary = Assert.Single(couriers.Value!);
        Assert.Equal(courier.Id, summary.UserId);
        Assert.Equal(0, summary.OpenOrderCount);
        Assert.Equal(220m, summary.OutstandingCard);
        Assert.Equal(0m, summary.OutstandingCash);
    }

    // ── Kapsam ──────────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Staff_CannotSeeOrActOnAnotherBranchesOrders()
    {
        await SeedAsync();
        DeliveryOrder mine = await SubmitOkAsync();

        Guid otherBranchId = Guid.NewGuid();
        DeliveryZone otherZone = DeliveryZone.Create(otherBranchId, "Levent", 10m, 0m, 30, 0);
        DbContext.DeliveryZones.Add(otherZone);
        await DbContext.SaveChangesAsync();
        DeliveryOrder foreign = DeliveryOrder.Create(otherBranchId, 1, Guid.NewGuid(), "Ayşe Kaya", "05551112233", "Levent", null, null,
            otherZone, PaymentMethod.Nakit, null);
        foreign.AddProductLine(Lahmacun, 100m, 10m, 1, null);
        DbContext.DeliveryOrders.Add(foreign);
        await DbContext.SaveChangesAsync();

        var list = await new GetDeliveryOrdersQueryHandler(Db, CurrentUser, new FixedBusinessDay(), Clock)
            .Handle(new GetDeliveryOrdersQuery { Scope = GetDeliveryOrdersQuery.ActiveScope }, CancellationToken.None);
        Assert.Equal(mine.Id, Assert.Single(list.Value!).Id);

        var get = await new GetDeliveryOrderQueryHandler(Db, CurrentUser).Handle(new GetDeliveryOrderQuery { Id = foreign.Id }, CancellationToken.None);
        Assert.Equal(DeliveryScope.NotFoundMessage, get.Error);

        var accept = await AcceptHandler().Handle(new AcceptDeliveryOrderCommand { Id = foreign.Id }, CancellationToken.None);
        Assert.Equal(DeliveryScope.NotFoundMessage, accept.Error);
        Assert.Equal(DeliveryOrderStatus.Received, foreign.Status);
    }

    [Fact]
    public async Task Waiter_CannotUseDeliveryEndpoints()
    {
        await SeedAsync();
        DeliveryOrder delivery = await SubmitOkAsync();
        var waiter = new FakeCurrentUserService { BranchId = CurrentUser.BranchId, UserId = Guid.NewGuid(), Role = "Waiter" };

        var list = await new GetDeliveryOrdersQueryHandler(Db, waiter, new FixedBusinessDay(), Clock)
            .Handle(new GetDeliveryOrdersQuery(), CancellationToken.None);
        var accept = await AcceptHandler(waiter).Handle(new AcceptDeliveryOrderCommand { Id = delivery.Id }, CancellationToken.None);

        Assert.Equal(DeliveryScope.WaiterDeniedMessage, list.Error);
        Assert.Equal(DeliveryScope.WaiterDeniedMessage, accept.Error);
    }

    [Fact]
    public async Task List_ShowsPhoneBlockFlag_AndAutoRejectDeadline()
    {
        await SeedAsync();
        DeliveryOrder delivery = await SubmitOkAsync();
        DbContext.BlockedPhones.Add(BlockedPhone.Create(Branch.Id, delivery.CustomerPhone, null, CurrentUser.UserId));
        await DbContext.SaveChangesAsync();

        var list = await new GetDeliveryOrdersQueryHandler(Db, CurrentUser, new FixedBusinessDay(), Clock)
            .Handle(new GetDeliveryOrdersQuery { Scope = GetDeliveryOrdersQuery.ActiveScope }, CancellationToken.None);

        DeliveryOrderDto dto = Assert.Single(list.Value!);
        Assert.True(dto.IsPhoneBlocked);
        Assert.Equal(delivery.CreatedAt.AddMinutes(10), dto.AutoRejectAt);
        Assert.Equal(40, dto.SuggestedEtaMinutes);
        Assert.Equal("Yeni", dto.StatusLabel);
    }

    // İş günü: bugünün UTC gece yarısı (testlerde gün sonu ayarı yok).
    private sealed class FixedBusinessDay : RestaurantBill.Application.Interfaces.IBusinessDayResolver
    {
        public DateOnly ResolveBusinessDay(Branch branch, DateTime utcMoment) => DateOnly.FromDateTime(utcMoment);
        public (DateTime FromUtc, DateTime ToUtc) ToUtcRange(Branch branch, DateOnly from, DateOnly to)
            => (from.ToDateTime(TimeOnly.MinValue), to.AddDays(1).ToDateTime(TimeOnly.MinValue));
    }
}

public class DeliveryTrackingTests : DeliveryTestBase
{
    private GetDeliveryTrackingQueryHandler TrackingHandler() => new(Db, Tenant);

    [Fact]
    public async Task Tracking_ByToken_MasksCustomer_AndShowsCustomerLabels()
    {
        await SeedAsync();
        DeliveryOrder delivery = await SubmitOkAsync();

        var received = await TrackingHandler().Handle(new GetDeliveryTrackingQuery { Token = delivery.AccessToken }, CancellationToken.None);

        Assert.True(received.IsSuccess, received.Error);
        DeliveryTrackingDto dto = received.Value!;
        Assert.Equal("Ahmet Y.", dto.CustomerName);
        Assert.Equal("0532 *** ** 67", dto.CustomerPhone);
        Assert.Equal("Onay bekliyor", dto.StatusLabel);
        Assert.True(dto.CanCancel);
        Assert.Equal(220m, dto.Total);
        Assert.Equal("0216 000 00 00", dto.RestaurantPhone);
        Assert.Null(dto.EstimatedDeliveryAt);

        await AcceptOkAsync(delivery, eta: 30);
        var accepted = await TrackingHandler().Handle(new GetDeliveryTrackingQuery { Token = delivery.AccessToken.ToUpperInvariant() }, CancellationToken.None);
        Assert.Equal("Onaylandı", accepted.Value!.StatusLabel);
        Assert.False(accepted.Value.CanCancel);
        Assert.Equal(delivery.AcceptedAt!.Value.AddMinutes(30), accepted.Value.EstimatedDeliveryAt);
    }

    [Fact]
    public async Task Tracking_UnknownTokenOrOtherRestaurant_IsNotFound()
    {
        await SeedAsync();
        DeliveryOrder delivery = await SubmitOkAsync();

        var unknown = await TrackingHandler().Handle(new GetDeliveryTrackingQuery { Token = AccessToken.New() }, CancellationToken.None);
        var byId = await TrackingHandler().Handle(new GetDeliveryTrackingQuery { Token = delivery.Id.ToString() }, CancellationToken.None);
        Tenant.Slug = "baska-restoran";
        var otherSlug = await TrackingHandler().Handle(new GetDeliveryTrackingQuery { Token = delivery.AccessToken }, CancellationToken.None);

        Assert.Equal(DeliveryScope.TrackingNotFoundMessage, unknown.Error);
        Assert.Equal(DeliveryScope.TrackingNotFoundMessage, byId.Error);
        Assert.Equal(DeliveryScope.TrackingNotFoundMessage, otherSlug.Error);
    }

    [Fact]
    public async Task Tracking_AutoRejected_ShowsOwnerWording()
    {
        await SeedAsync();
        DeliveryOrder delivery = await SubmitOkAsync();
        await new DeliveryOrderSweeper(Db, CashierNotifications).AutoRejectStaleAsync(delivery.CreatedAt.AddMinutes(30), CancellationToken.None);

        var result = await TrackingHandler().Handle(new GetDeliveryTrackingQuery { Token = delivery.AccessToken }, CancellationToken.None);

        Assert.Equal("Restoran şu an yanıt veremedi.", result.Value!.RejectReason);
        Assert.Equal("Restoran şu an yanıt veremedi.", result.Value.StatusDescription);
    }

    [Fact]
    public async Task CustomerCancel_OnlyWhileReceived()
    {
        await SeedAsync();
        DeliveryOrder first = await SubmitOkAsync();
        DeliveryOrder second = await SubmitOkAsync("0533 000 00 01");
        await AcceptOkAsync(second);
        var handler = new CancelDeliveryOrderByCustomerCommandHandler(Db, Tenant, CashierNotifications, Clock);

        Result cancelled = await handler.Handle(new CancelDeliveryOrderByCustomerCommand { Token = first.AccessToken }, CancellationToken.None);
        Result late = await handler.Handle(new CancelDeliveryOrderByCustomerCommand { Token = second.AccessToken }, CancellationToken.None);

        Assert.True(cancelled.IsSuccess, cancelled.Error);
        Assert.Equal(DeliveryOrderStatus.Cancelled, first.Status);
        Assert.Null(first.CancelledByUserId);
        Assert.True(late.IsFailure);
        Assert.Equal(DeliveryOrderStatus.Accepted, second.Status);
    }
}
