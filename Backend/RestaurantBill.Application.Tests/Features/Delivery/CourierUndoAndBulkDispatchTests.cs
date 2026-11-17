using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.Delivery.Courier;
using RestaurantBill.Application.Features.Delivery.Public;
using RestaurantBill.Application.Features.Delivery.Staff;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.Delivery;

// Kurye: teslimi geri alma (2 dk, kasaya teslim edilmeden), "Hepsiyle yola çık" ve takip sayfasında kuryenin ilk adı.
public class CourierUndoAndBulkDispatchTests : DeliveryTestBase
{
    private sealed class DayOfClock : IBusinessDayResolver
    {
        public DateOnly ResolveBusinessDay(Branch branch, DateTime utcMoment) => DateOnly.FromDateTime(utcMoment);
        public (DateTime FromUtc, DateTime ToUtc) ToUtcRange(Branch branch, DateOnly from, DateOnly to)
            => (from.ToDateTime(TimeOnly.MinValue), to.AddDays(1).ToDateTime(TimeOnly.MinValue));
    }

    private int _phoneSuffix;

    private async Task<User> SeedCourierAsync(string name)
    {
        User user = User.Create(name, $"{Guid.NewGuid():N}@test.com", "5550000000");
        DbContext.Users.Add(user);
        DbContext.UserBranches.Add(UserBranch.Create(user, Branch, name.ToLowerInvariant().Replace(' ', '.'), null, UserRole.Courier));
        await DbContext.SaveChangesAsync();
        return user;
    }

    private FakeCurrentUserService As(User user) => new() { BranchId = Branch.Id, CompanyId = Company.Id, UserId = user.Id, Role = "Courier" };

    /// <summary>Gönder → kabul → mutfak "hazır" → kuryeye ata (2 Lahmacun, ₺220).</summary>
    private async Task<DeliveryOrder> ReadyForAsync(User courier)
    {
        DeliveryOrder delivery = await SubmitOkAsync($"0533 000 00 {++_phoneSuffix:00}");
        await AcceptOkAsync(delivery);
        Result ready = await new UpdateOrderStatusCommandHandler(Db, TableNotifications, CashierNotifications, CurrentUser)
            .Handle(new UpdateOrderStatusCommand { OrderId = delivery.OrderId!.Value, Status = (int)OrderStatus.Ready }, CancellationToken.None);
        Assert.True(ready.IsSuccess, ready.Error);

        Result assigned = await new AssignCourierCommandHandler(Db, CurrentUser, CashierNotifications, CourierNotifications)
            .Handle(new AssignCourierCommand { Id = delivery.Id, CourierUserId = courier.Id }, CancellationToken.None);
        Assert.True(assigned.IsSuccess, assigned.Error);
        return delivery;
    }

    private async Task<DeliveryOrder> DeliveredAsync(User courier, PaymentMethod method = PaymentMethod.Nakit)
    {
        DeliveryOrder delivery = await ReadyForAsync(courier);
        Result dispatched = await new DispatchDeliveryOrderCommandHandler(Db, As(courier), CashierNotifications, CourierNotifications, Clock)
            .Handle(new DispatchDeliveryOrderCommand { Id = delivery.Id }, CancellationToken.None);
        Assert.True(dispatched.IsSuccess, dispatched.Error);
        Result delivered = await new DeliverDeliveryOrderCommandHandler(Db, As(courier), CashierNotifications, CourierNotifications, Clock)
            .Handle(new DeliverDeliveryOrderCommand { Id = delivery.Id, Method = method }, CancellationToken.None);
        Assert.True(delivered.IsSuccess, delivered.Error);
        return delivery;
    }

    private Task<Result> UndoAsync(DeliveryOrder delivery, ICurrentUserService user)
        => new UndoDeliverDeliveryOrderCommandHandler(Db, user, CashierNotifications, CourierNotifications, Clock)
            .Handle(new UndoDeliverDeliveryOrderCommand { Id = delivery.Id }, CancellationToken.None);

    private Task<Result<CourierBulkDispatchResultDto>> DispatchManyAsync(ICurrentUserService user, params DeliveryOrder[] orders)
        => new DispatchCourierOrdersCommandHandler(Db, user, CashierNotifications, CourierNotifications, Clock)
            .Handle(new DispatchCourierOrdersCommand { Ids = orders.Select(o => o.Id).ToList() }, CancellationToken.None);

    // ── Teslimi geri al ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task UndoDeliver_WithinWindow_PutsOrderBackOnTheWay_AndNotifiesBoardAndCourier()
    {
        await SeedAsync();
        User kaan = await SeedCourierAsync("Kurye Kaan");
        DeliveryOrder delivery = await DeliveredAsync(kaan, PaymentMethod.Kart);
        CashierNotifications.DeliveryOrdersChanged.Clear();
        CourierNotifications.Sent.Clear();
        Clock.Now = Clock.Now.AddSeconds(90);

        Result result = await UndoAsync(delivery, As(kaan));

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(DeliveryOrderStatus.OnTheWay, delivery.Status);
        Assert.Null(delivery.CollectedMethod);
        Assert.Null(delivery.CollectedAmount);
        Assert.Null(delivery.DeliveredAt);
        Assert.Contains(CashierNotifications.DeliveryOrdersChanged, n => n.Payload.Id == delivery.Id && n.Payload.Status == DeliveryOrderStatus.OnTheWay);
        Assert.Contains(CourierNotifications.Sent, s => s.CourierUserId == kaan.Id && s.DeliveryOrderId == delivery.Id);
        Assert.Contains(DbContext.AuditLogs, a => a.Action == "DeliveryOrderDeliverUndone" && a.EntityId == delivery.Id);

        // Kurye ekranında yeniden "Teslim ettim" basılabilir; özetteki tahsilat düşer.
        var orders = await new GetCourierOrdersQueryHandler(Db, As(kaan), new DayOfClock(), Clock).Handle(new GetCourierOrdersQuery(), CancellationToken.None);
        CourierOrderDto card = Assert.Single(orders.Value!);
        Assert.True(card.CanDeliver);
        Assert.Null(card.UndoDeliverUntil);
        var summary = await new GetCourierSummaryQueryHandler(Db, As(kaan), new DayOfClock(), Clock).Handle(new GetCourierSummaryQuery(), CancellationToken.None);
        Assert.Equal(0m, summary.Value!.OutstandingCard);
    }

    [Fact]
    public async Task CourierOrders_ShowUndoDeadline_OnlyWithinWindow()
    {
        await SeedAsync();
        User kaan = await SeedCourierAsync("Kurye Kaan");
        DeliveryOrder delivery = await DeliveredAsync(kaan);
        DateTime deliveredAt = delivery.DeliveredAt!.Value;

        var fresh = await new GetCourierOrdersQueryHandler(Db, As(kaan), new DayOfClock(), Clock).Handle(new GetCourierOrdersQuery(), CancellationToken.None);
        Assert.Equal(deliveredAt.AddMinutes(DeliveryOrder.UndoDeliverWindowMinutes), Assert.Single(fresh.Value!).UndoDeliverUntil);

        Clock.Now = Clock.Now.AddMinutes(DeliveryOrder.UndoDeliverWindowMinutes).AddSeconds(1);
        var later = await new GetCourierOrdersQueryHandler(Db, As(kaan), new DayOfClock(), Clock).Handle(new GetCourierOrdersQuery(), CancellationToken.None);
        Assert.Null(Assert.Single(later.Value!).UndoDeliverUntil);
    }

    [Fact]
    public async Task UndoDeliver_AfterWindow_Fails()
    {
        await SeedAsync();
        User kaan = await SeedCourierAsync("Kurye Kaan");
        DeliveryOrder delivery = await DeliveredAsync(kaan);
        CourierNotifications.Sent.Clear();
        Clock.Now = Clock.Now.AddMinutes(DeliveryOrder.UndoDeliverWindowMinutes).AddSeconds(1);

        Result result = await UndoAsync(delivery, As(kaan));

        Assert.True(result.IsFailure);
        Assert.Equal(DeliveryOrderStatus.Delivered, delivery.Status);
        Assert.Equal(PaymentMethod.Nakit, delivery.CollectedMethod);
        Assert.Empty(CourierNotifications.Sent);
    }

    [Fact]
    public async Task UndoDeliver_AfterHandoverToTill_Fails()
    {
        await SeedAsync();
        User kaan = await SeedCourierAsync("Kurye Kaan");
        DeliveryOrder delivery = await DeliveredAsync(kaan);
        delivery.Settle(CurrentUser.UserId, Clock.GetUtcNow().UtcDateTime);
        await DbContext.SaveChangesAsync();

        Result result = await UndoAsync(delivery, As(kaan));

        Assert.True(result.IsFailure);
        Assert.Equal(DeliveryOrderStatus.Delivered, delivery.Status);
        Assert.NotNull(delivery.CollectedAt);
    }

    [Fact]
    public async Task UndoDeliver_OtherCouriersOrder_Fails()
    {
        await SeedAsync();
        User kaan = await SeedCourierAsync("Kurye Kaan");
        User mert = await SeedCourierAsync("Kurye Mert");
        DeliveryOrder delivery = await DeliveredAsync(kaan);

        Result result = await UndoAsync(delivery, As(mert));

        Assert.Equal(CourierOwnership.NotYoursMessage, result.Error);
        Assert.Equal(DeliveryOrderStatus.Delivered, delivery.Status);
    }

    // ── Hepsiyle yola çık ───────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task DispatchMany_DispatchesOwnReadyOrders_SkipsOthers_AndNotifiesOnce()
    {
        await SeedAsync();
        User kaan = await SeedCourierAsync("Kurye Kaan");
        User mert = await SeedCourierAsync("Kurye Mert");
        DeliveryOrder first = await ReadyForAsync(kaan);
        DeliveryOrder second = await ReadyForAsync(kaan);
        DeliveryOrder mertsOrder = await ReadyForAsync(mert);
        CashierNotifications.DeliveryOrdersChanged.Clear();
        CourierNotifications.Sent.Clear();

        var result = await DispatchManyAsync(As(kaan), first, second, mertsOrder);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(2, result.Value!.DispatchedCount);
        Assert.Equal([first.Number, second.Number], result.Value.DispatchedNumbers);
        Assert.Equal(1, result.Value.SkippedCount);
        Assert.Equal(DeliveryOrderStatus.OnTheWay, first.Status);
        Assert.Equal(DeliveryOrderStatus.OnTheWay, second.Status);
        Assert.Equal(Clock.GetUtcNow().UtcDateTime, first.DispatchedAt);
        Assert.Equal(DeliveryOrderStatus.Ready, mertsOrder.Status);

        Assert.Equal([first.Id, second.Id], CashierNotifications.DeliveryOrdersChanged.Select(n => n.Payload.Id));
        Assert.Equal(kaan.Id, Assert.Single(CourierNotifications.Sent).CourierUserId);
        Assert.Equal(2, DbContext.AuditLogs.Count(a => a.Action == "DeliveryOrderDispatched"));
    }

    [Fact]
    public async Task DispatchMany_NothingReady_Fails()
    {
        await SeedAsync();
        User kaan = await SeedCourierAsync("Kurye Kaan");
        DeliveryOrder delivery = await ReadyForAsync(kaan);
        Assert.True((await DispatchManyAsync(As(kaan), delivery)).IsSuccess);
        CourierNotifications.Sent.Clear();

        var again = await DispatchManyAsync(As(kaan), delivery);

        Assert.Equal(DispatchCourierOrdersCommandHandler.NothingReadyMessage, again.Error);
        Assert.Empty(CourierNotifications.Sent);
    }

    [Fact]
    public void DispatchMany_Validator_RequiresIds()
    {
        var validator = new DispatchCourierOrdersCommandValidator();
        Assert.False(validator.Validate(new DispatchCourierOrdersCommand()).IsValid);
        Assert.False(validator.Validate(new DispatchCourierOrdersCommand
        {
            Ids = Enumerable.Range(0, DispatchCourierOrdersCommandValidator.MaxOrders + 1).Select(_ => Guid.NewGuid()).ToList()
        }).IsValid);
        Assert.True(validator.Validate(new DispatchCourierOrdersCommand { Ids = [Guid.NewGuid()] }).IsValid);
    }

    // ── Takip sayfası: kuryenin yalnızca ilk adı, yalnızca yoldayken ───────────────────────────────

    [Fact]
    public async Task Tracking_OnTheWay_ShowsCourierFirstNameAndDispatchTime_OnlyWhileOnTheWay()
    {
        await SeedAsync();
        User kaan = await SeedCourierAsync("Kaan Demir");
        DeliveryOrder delivery = await ReadyForAsync(kaan);
        var handler = new GetDeliveryTrackingQueryHandler(Db, Tenant);

        DeliveryTrackingDto ready = (await handler.Handle(new GetDeliveryTrackingQuery { Token = delivery.AccessToken }, CancellationToken.None)).Value!;
        Assert.Equal(string.Empty, ready.CourierFirstName);
        Assert.Null(ready.DispatchedAt);

        Assert.True((await DispatchManyAsync(As(kaan), delivery)).IsSuccess);
        DeliveryTrackingDto onTheWay = (await handler.Handle(new GetDeliveryTrackingQuery { Token = delivery.AccessToken }, CancellationToken.None)).Value!;
        Assert.Equal("Kaan", onTheWay.CourierFirstName);
        Assert.Equal(Clock.GetUtcNow().UtcDateTime, onTheWay.DispatchedAt);

        Result delivered = await new DeliverDeliveryOrderCommandHandler(Db, As(kaan), CashierNotifications, CourierNotifications, Clock)
            .Handle(new DeliverDeliveryOrderCommand { Id = delivery.Id, Method = PaymentMethod.Nakit }, CancellationToken.None);
        Assert.True(delivered.IsSuccess, delivered.Error);
        DeliveryTrackingDto done = (await handler.Handle(new GetDeliveryTrackingQuery { Token = delivery.AccessToken }, CancellationToken.None)).Value!;
        Assert.Equal(string.Empty, done.CourierFirstName);
    }
}
