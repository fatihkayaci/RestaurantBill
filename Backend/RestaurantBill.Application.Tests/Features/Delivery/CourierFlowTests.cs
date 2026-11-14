using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Features.Delivery.Courier;
using RestaurantBill.Application.Features.Delivery.Staff;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.Delivery;

// Kurye ekranı (kendi siparişleri, yola çıkış/teslim) ve kasiyerin "Teslim al"ı. Sipariş: 2 Lahmacun (₺200) + ₺20
// teslimat = ₺220; şubenin KDV oranı %10.
public class CourierFlowTests : DeliveryTestBase
{
    private sealed class DayOfClock : IBusinessDayResolver
    {
        public DateOnly ResolveBusinessDay(Branch branch, DateTime utcMoment) => DateOnly.FromDateTime(utcMoment);
        public (DateTime FromUtc, DateTime ToUtc) ToUtcRange(Branch branch, DateOnly from, DateOnly to)
            => (from.ToDateTime(TimeOnly.MinValue), to.AddDays(1).ToDateTime(TimeOnly.MinValue));
    }

    private int _phoneSuffix;

    private async Task<User> SeedStaffAsync(string name, UserRole role, Branch? branch = null)
    {
        User user = User.Create(name, $"{Guid.NewGuid():N}@test.com", "5550000000");
        DbContext.Users.Add(user);
        DbContext.UserBranches.Add(UserBranch.Create(user, branch ?? Branch, name.ToLowerInvariant().Replace(' ', '.'), null, role));
        await DbContext.SaveChangesAsync();
        return user;
    }

    private FakeCurrentUserService As(User user, string role)
        => new() { BranchId = Branch.Id, CompanyId = Company.Id, UserId = user.Id, Role = role };

    private async Task<(CashRegister Register, Shift Shift)> SeedRegisterAsync(Guid openedBy, Guid? branchId = null, bool openShift = true)
    {
        CashRegister register = CashRegister.Create("Ana Kasa", 500m, branchId ?? Branch.Id);
        DbContext.CashRegisters.Add(register);
        await DbContext.SaveChangesAsync();

        Shift shift = Shift.Create(branchId ?? Branch.Id, register.Id, openedBy, 500m, 500m);
        if (openShift)
        {
            DbContext.Shifts.Add(shift);
            await DbContext.SaveChangesAsync();
        }
        return (register, shift);
    }

    /// <summary>Gönder → kabul → mutfak "hazır" → kuryeye ata. Satır verilmezse 2 Lahmacun (₺220).</summary>
    private async Task<DeliveryOrder> ReadyForAsync(User courier, decimal? expectedTotal = null, params CartLineInput[] lines)
    {
        DeliveryOrder delivery;
        if (lines.Length == 0)
        {
            // Telefon başına açık sipariş sınırına takılmamak için her siparişte ayrı numara.
            delivery = await SubmitOkAsync($"0532 000 00 {++_phoneSuffix:00}");
        }
        else
        {
            var submit = await SubmitAsync(Submit(expectedTotal!.Value, lines));
            Assert.True(submit.IsSuccess, submit.Error);
            delivery = DbContext.DeliveryOrders.Single(d => d.AccessToken == submit.Value!.Token);
        }

        await AcceptOkAsync(delivery);
        Result ready = await new UpdateOrderStatusCommandHandler(Db, TableNotifications, CashierNotifications, CurrentUser)
            .Handle(new UpdateOrderStatusCommand { OrderId = delivery.OrderId!.Value, Status = (int)OrderStatus.Ready }, CancellationToken.None);
        Assert.True(ready.IsSuccess, ready.Error);
        Assert.Equal(DeliveryOrderStatus.Ready, delivery.Status);

        Result assigned = await new AssignCourierCommandHandler(Db, CurrentUser, CashierNotifications, CourierNotifications)
            .Handle(new AssignCourierCommand { Id = delivery.Id, CourierUserId = courier.Id }, CancellationToken.None);
        Assert.True(assigned.IsSuccess, assigned.Error);
        return delivery;
    }

    private Task<Result> DispatchAsync(DeliveryOrder delivery, ICurrentUserService user)
        => new DispatchDeliveryOrderCommandHandler(Db, user, CashierNotifications, CourierNotifications, Clock)
            .Handle(new DispatchDeliveryOrderCommand { Id = delivery.Id }, CancellationToken.None);

    private Task<Result> DeliverAsync(DeliveryOrder delivery, ICurrentUserService user, PaymentMethod method)
        => new DeliverDeliveryOrderCommandHandler(Db, user, CashierNotifications, CourierNotifications, Clock)
            .Handle(new DeliverDeliveryOrderCommand { Id = delivery.Id, Method = method }, CancellationToken.None);

    private async Task<DeliveryOrder> DeliveredAsync(User courier, PaymentMethod method, decimal? expectedTotal = null, params CartLineInput[] lines)
    {
        DeliveryOrder delivery = await ReadyForAsync(courier, expectedTotal, lines);
        FakeCurrentUserService me = As(courier, "Courier");
        Result dispatched = await DispatchAsync(delivery, me);
        Assert.True(dispatched.IsSuccess, dispatched.Error);
        Result delivered = await DeliverAsync(delivery, me, method);
        Assert.True(delivered.IsSuccess, delivered.Error);
        return delivery;
    }

    private Task<Result<CourierHandoverResultDto>> HandoverAsync(User courier, CashRegister register, ICurrentUserService? user = null, params DeliveryOrder[] orders)
        => new HandoverCourierCashCommandHandler(Db, user ?? CurrentUser, CashierNotifications, CourierNotifications, Clock)
            .Handle(new HandoverCourierCashCommand
            {
                CourierUserId = courier.Id,
                CashRegisterId = register.Id,
                DeliveryOrderIds = orders.Select(o => o.Id).ToList()
            }, CancellationToken.None);

    private Order LinkedOrder(DeliveryOrder delivery) => DbContext.Orders.Single(o => o.Id == delivery.OrderId);

    // ── Kurye uçları: sahiplik ve görünürlük ───────────────────────────────────────────────────────

    [Fact]
    public async Task Courier_CanOnlyDispatchAndDeliverOwnOrders()
    {
        await SeedAsync();
        User kaan = await SeedStaffAsync("Kurye Kaan", UserRole.Courier);
        User mert = await SeedStaffAsync("Kurye Mert", UserRole.Courier);
        DeliveryOrder delivery = await ReadyForAsync(kaan);

        Result foreignDispatch = await DispatchAsync(delivery, As(mert, "Courier"));
        Assert.Equal(CourierOwnership.NotYoursMessage, foreignDispatch.Error);
        Assert.Equal(DeliveryOrderStatus.Ready, delivery.Status);

        Result dispatched = await DispatchAsync(delivery, As(kaan, "Courier"));
        Assert.True(dispatched.IsSuccess, dispatched.Error);
        Assert.Equal(DeliveryOrderStatus.OnTheWay, delivery.Status);

        Result foreignDeliver = await DeliverAsync(delivery, As(mert, "Courier"), PaymentMethod.Nakit);
        Assert.Equal(CourierOwnership.NotYoursMessage, foreignDeliver.Error);
        Assert.Equal(DeliveryOrderStatus.OnTheWay, delivery.Status);

        Result delivered = await DeliverAsync(delivery, As(kaan, "Courier"), PaymentMethod.Nakit);
        Assert.True(delivered.IsSuccess, delivered.Error);
        Assert.Equal(PaymentMethod.Nakit, delivery.CollectedMethod);
        Assert.Equal(220m, delivery.CollectedAmount);
        // Teslim, siparişi kapatmaz: kasiyer "Teslim al" diyene kadar açık kalır.
        Assert.False(LinkedOrder(delivery).IsClosed());
        Assert.Contains(CourierNotifications.Sent, s => s.CourierUserId == kaan.Id && s.DeliveryOrderId == delivery.Id);
    }

    [Fact]
    public async Task StaffCanStillDispatchAndDeliverOnBehalfOfCourier()
    {
        await SeedAsync();
        User kaan = await SeedStaffAsync("Kurye Kaan", UserRole.Courier);
        DeliveryOrder delivery = await ReadyForAsync(kaan);

        Assert.True((await DispatchAsync(delivery, CurrentUser)).IsSuccess);
        Assert.True((await DeliverAsync(delivery, CurrentUser, PaymentMethod.Kart)).IsSuccess);
        Assert.Equal(DeliveryOrderStatus.Delivered, delivery.Status);
    }

    [Fact]
    public async Task CourierOrders_ShowOnlyOwnActiveAndTodaysDelivered_WithMapsQuery()
    {
        await SeedAsync();
        User kaan = await SeedStaffAsync("Kurye Kaan", UserRole.Courier);
        User mert = await SeedStaffAsync("Kurye Mert", UserRole.Courier);
        DeliveryOrder ready = await ReadyForAsync(kaan);
        DeliveryOrder delivered = await DeliveredAsync(kaan, PaymentMethod.Nakit);
        DeliveryOrder others = await ReadyForAsync(mert);

        var orders = await new GetCourierOrdersQueryHandler(Db, As(kaan, "Courier"), new DayOfClock(), Clock)
            .Handle(new GetCourierOrdersQuery(), CancellationToken.None);

        Assert.True(orders.IsSuccess, orders.Error);
        Assert.Equal([ready.Id, delivered.Id], orders.Value!.Select(o => o.Id));
        Assert.DoesNotContain(orders.Value!, o => o.Id == others.Id);

        CourierOrderDto card = orders.Value![0];
        Assert.True(card.CanDispatch);
        Assert.False(card.CanDeliver);
        Assert.Equal("Moda Cad. No:1 D:3, Moda, İstanbul", card.MapsQuery);
        Assert.Equal("+905320000001", card.CustomerPhone);
        Assert.Equal(220m, card.Total);
        Assert.Equal(PaymentMethod.Nakit, card.PaymentPreference);
        Assert.Equal("Lahmacun", Assert.Single(card.Lines).Name);

        var summary = await new GetCourierSummaryQueryHandler(Db, As(kaan, "Courier"), new DayOfClock(), Clock)
            .Handle(new GetCourierSummaryQuery(), CancellationToken.None);
        Assert.Equal(1, summary.Value!.DeliveredTodayCount);
        Assert.Equal(1, summary.Value.ActiveOrderCount);
        Assert.Equal(220m, summary.Value.OutstandingCash);
        Assert.Equal(0m, summary.Value.OutstandingCard);

        var mertSummary = await new GetCourierSummaryQueryHandler(Db, As(mert, "Courier"), new DayOfClock(), Clock)
            .Handle(new GetCourierSummaryQuery(), CancellationToken.None);
        Assert.Equal(0m, mertSummary.Value!.OutstandingCash);
    }

    [Fact]
    public async Task Reassign_NotifiesPreviousAndNewCourier_CancelNotifiesCourier()
    {
        await SeedAsync();
        User kaan = await SeedStaffAsync("Kurye Kaan", UserRole.Courier);
        User mert = await SeedStaffAsync("Kurye Mert", UserRole.Courier);
        DeliveryOrder delivery = await ReadyForAsync(kaan);
        CourierNotifications.Sent.Clear();

        Result reassigned = await new AssignCourierCommandHandler(Db, CurrentUser, CashierNotifications, CourierNotifications)
            .Handle(new AssignCourierCommand { Id = delivery.Id, CourierUserId = mert.Id }, CancellationToken.None);
        Assert.True(reassigned.IsSuccess, reassigned.Error);
        Assert.Equal([kaan.Id, mert.Id], CourierNotifications.Sent.Select(s => s.CourierUserId));

        CourierNotifications.Sent.Clear();
        Result cancelled = await new CancelDeliveryOrderCommandHandler(Db, CurrentUser, CashierNotifications, KitchenNotifications, CourierNotifications, Clock)
            .Handle(new CancelDeliveryOrderCommand { Id = delivery.Id, Reason = "Müşteri vazgeçti" }, CancellationToken.None);
        Assert.True(cancelled.IsSuccess, cancelled.Error);
        Assert.Equal(mert.Id, Assert.Single(CourierNotifications.Sent).CourierUserId);
    }

    // ── "Teslim al" ───────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Handover_Cash_WritesItemAndFeePayments_CashIn_AndClosesOrder()
    {
        await SeedAsync();
        User kaan = await SeedStaffAsync("Kurye Kaan", UserRole.Courier);
        User kemal = await SeedStaffAsync("Kasiyer Kemal", UserRole.Cashier);
        var (register, shift) = await SeedRegisterAsync(kemal.Id);
        DeliveryOrder delivery = await DeliveredAsync(kaan, PaymentMethod.Nakit);
        Order order = LinkedOrder(delivery);
        CourierNotifications.Sent.Clear();

        var result = await HandoverAsync(kaan, register, As(kemal, "Cashier"), delivery);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(1, result.Value!.SettledCount);
        Assert.Equal(220m, result.Value.CashAmount);
        Assert.Equal(0m, result.Value.CardAmount);

        List<Payment> payments = DbContext.Payments.Where(p => p.OrderId == order.Id).ToList();
        Payment items = Assert.Single(payments, p => !p.IsDeliveryFee);
        Payment fee = Assert.Single(payments, p => p.IsDeliveryFee);
        Assert.Equal(200m, items.TotalAmount);
        Assert.Equal(2, items.ItemCount);
        Assert.Equal(20m, fee.TotalAmount);
        Assert.Equal(Branch.TaxRate, fee.TaxRate);
        Assert.Equal(0, fee.ItemCount);
        Assert.Equal(18.18m, fee.Matrah);
        Assert.Equal(1.82m, fee.TaxAmount);
        Assert.All(payments, p =>
        {
            Assert.Equal(PaymentMethod.Nakit, p.PaymentMethod);
            Assert.Equal(kaan.Id, p.UserId);
            Assert.Equal(shift.Id, p.ShiftId);
            Assert.Equal(register.Id, p.CashRegisterId);
        });

        // Ürün raporu satır kalemlerinden: ücretin satır kalemi yok.
        List<PaymentLineItem> lines = DbContext.PaymentLineItems.Where(l => payments.Select(p => p.Id).Contains(l.PaymentId)).ToList();
        PaymentLineItem line = Assert.Single(lines);
        Assert.Equal(items.Id, line.PaymentId);
        Assert.Equal(Lahmacun.Id, line.ProductId);
        Assert.Equal(2, line.Quantity);

        CashTransaction cash = Assert.Single(DbContext.CashTransactions);
        Assert.Equal(CashTransactionType.In, cash.Type);
        Assert.Equal(220m, cash.Amount);
        Assert.Equal(register.Id, cash.CashRegisterId);
        Assert.Equal(720m, register.Balance);

        Assert.Equal(OrderStatus.Paid, order.Status);
        Assert.True(order.DeliveryFeeSettled);
        Assert.Empty(order.OrderItems);
        Assert.Equal(DeliveryOrderStatus.Delivered, delivery.Status);
        Assert.NotNull(delivery.SettledAt);
        Assert.Equal(kemal.Id, delivery.SettledByUserId);

        Assert.Contains(DbContext.AuditLogs, a => a.Action == "DeliveryOrderSettled" && a.EntityId == delivery.Id);
        Assert.Contains(CashierNotifications.DeliveryOrdersChanged, d => d.Payload.Id == delivery.Id);
        Assert.Equal(kaan.Id, Assert.Single(CourierNotifications.Sent).CourierUserId);

        var couriers = await new GetCouriersQueryHandler(Db, CurrentUser).Handle(new GetCouriersQuery(), CancellationToken.None);
        CourierSummaryDto summary = Assert.Single(couriers.Value!);
        Assert.Equal(0m, summary.OutstandingCash);
        Assert.Empty(summary.OutstandingOrders);
    }

    [Fact]
    public async Task Handover_Card_WritesNoCashTransaction()
    {
        await SeedAsync();
        User kaan = await SeedStaffAsync("Kurye Kaan", UserRole.Courier);
        var (register, _) = await SeedRegisterAsync(CurrentUser.UserId);
        DeliveryOrder delivery = await DeliveredAsync(kaan, PaymentMethod.Kart);

        var result = await HandoverAsync(kaan, register, null, delivery);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(220m, result.Value!.CardAmount);
        Assert.Empty(DbContext.CashTransactions);
        Assert.Equal(500m, register.Balance);
        Assert.All(DbContext.Payments, p => Assert.Equal(PaymentMethod.Kart, p.PaymentMethod));
        Assert.Equal(220m, DbContext.Payments.Sum(p => p.TotalAmount));
        Assert.Equal(OrderStatus.Paid, LinkedOrder(delivery).Status);
        Assert.NotNull(delivery.SettledAt);
    }

    [Fact]
    public async Task Handover_SetMenuOrder_WritesOneSetMenuLine_PlusFee()
    {
        await SeedAsync();
        User kaan = await SeedStaffAsync("Kurye Kaan", UserRole.Courier);
        var (register, _) = await SeedRegisterAsync(CurrentUser.UserId);
        // Adana Menü (₺250) + Kola (+₺10) + ₺20 teslimat = ₺280.
        DeliveryOrder delivery = await DeliveredAsync(kaan, PaymentMethod.Nakit, 280m, MenuLine(Kola));

        var result = await HandoverAsync(kaan, register, null, delivery);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(280m, result.Value!.CashAmount);
        PaymentLineItem line = Assert.Single(DbContext.PaymentLineItems);
        Assert.Equal(AdanaMenu.Id, line.SetMenuId);
        Assert.Equal(260m, line.UnitPrice);
        Assert.Equal(1, line.Quantity);
        Assert.Equal(20m, DbContext.Payments.Single(p => p.IsDeliveryFee).TotalAmount);
        Assert.Equal(280m, Assert.Single(DbContext.CashTransactions).Amount);
        Order order = LinkedOrder(delivery);
        Assert.Equal(OrderStatus.Paid, order.Status);
        Assert.Empty(order.OrderItems);
    }

    [Fact]
    public async Task Handover_SeveralOrders_SettlesAllInOneGo()
    {
        await SeedAsync();
        User kaan = await SeedStaffAsync("Kurye Kaan", UserRole.Courier);
        var (register, _) = await SeedRegisterAsync(CurrentUser.UserId);
        DeliveryOrder cash = await DeliveredAsync(kaan, PaymentMethod.Nakit);
        DeliveryOrder card = await DeliveredAsync(kaan, PaymentMethod.Kart);

        var result = await HandoverAsync(kaan, register, null, cash, card);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(2, result.Value!.SettledCount);
        Assert.Equal(220m, result.Value.CashAmount);
        Assert.Equal(220m, result.Value.CardAmount);
        Assert.Equal(440m, result.Value.Total);
        Assert.Equal(220m, Assert.Single(DbContext.CashTransactions).Amount);
        Assert.All(new[] { cash, card }, d => Assert.NotNull(d.SettledAt));
    }

    [Fact]
    public async Task Handover_WrongCourier_IsRejected_AndNothingIsWritten()
    {
        await SeedAsync();
        User kaan = await SeedStaffAsync("Kurye Kaan", UserRole.Courier);
        User mert = await SeedStaffAsync("Kurye Mert", UserRole.Courier);
        var (register, _) = await SeedRegisterAsync(CurrentUser.UserId);
        DeliveryOrder delivery = await DeliveredAsync(kaan, PaymentMethod.Nakit);

        var result = await HandoverAsync(mert, register, null, delivery);

        Assert.Equal("PAKET #1 bu kuryenin siparişi değil.", result.Error);
        AssertNothingSettled(delivery);
    }

    [Fact]
    public async Task Handover_AlreadySettled_IsRejected_EvenWhenMixedWithAValidOne()
    {
        await SeedAsync();
        User kaan = await SeedStaffAsync("Kurye Kaan", UserRole.Courier);
        var (register, _) = await SeedRegisterAsync(CurrentUser.UserId);
        DeliveryOrder first = await DeliveredAsync(kaan, PaymentMethod.Nakit);
        Assert.True((await HandoverAsync(kaan, register, null, first)).IsSuccess);
        int paymentCount = DbContext.Payments.Count();
        DeliveryOrder second = await DeliveredAsync(kaan, PaymentMethod.Nakit);

        var again = await HandoverAsync(kaan, register, null, first, second);

        Assert.Equal("PAKET #1 siparişinin tahsilatı zaten teslim alındı.", again.Error);
        Assert.Equal(paymentCount, DbContext.Payments.Count());
        Assert.Single(DbContext.CashTransactions);
        AssertNothingSettled(second);
    }

    [Fact]
    public async Task Handover_NotYetDelivered_IsRejected()
    {
        await SeedAsync();
        User kaan = await SeedStaffAsync("Kurye Kaan", UserRole.Courier);
        var (register, _) = await SeedRegisterAsync(CurrentUser.UserId);
        DeliveryOrder delivery = await ReadyForAsync(kaan);
        Assert.True((await DispatchAsync(delivery, As(kaan, "Courier"))).IsSuccess);

        var result = await HandoverAsync(kaan, register, null, delivery);

        Assert.Equal("PAKET #1 henüz teslim edilmedi.", result.Error);
        Assert.Empty(DbContext.Payments);
    }

    [Fact]
    public async Task Handover_ForeignBranchOrderOrRegister_IsNotFound()
    {
        await SeedAsync();
        User kaan = await SeedStaffAsync("Kurye Kaan", UserRole.Courier);
        var (register, _) = await SeedRegisterAsync(CurrentUser.UserId);
        DeliveryOrder mine = await DeliveredAsync(kaan, PaymentMethod.Nakit);

        Guid otherBranchId = Guid.NewGuid();
        DeliveryZone otherZone = DeliveryZone.Create(otherBranchId, "Levent", 10m, 0m, 30, 0);
        DbContext.DeliveryZones.Add(otherZone);
        await DbContext.SaveChangesAsync();
        DeliveryOrder foreign = DeliveryOrder.Create(otherBranchId, 1, Guid.NewGuid(), "Ayşe Kaya", "05551112233", "Levent", null, null,
            otherZone, PaymentMethod.Nakit, null);
        foreign.AddProductLine(Lahmacun, 100m, 10m, 1, null);
        DbContext.DeliveryOrders.Add(foreign);
        await DbContext.SaveChangesAsync();

        var foreignOrder = await HandoverAsync(kaan, register, null, mine, foreign);
        Assert.Equal(HandoverCourierCashCommandHandler.OrderNotFoundMessage, foreignOrder.Error);

        var (otherRegister, _) = await SeedRegisterAsync(CurrentUser.UserId, otherBranchId);
        var foreignRegister = await HandoverAsync(kaan, otherRegister, null, mine);
        Assert.Equal(HandoverCourierCashCommandHandler.RegisterNotFoundMessage, foreignRegister.Error);

        AssertNothingSettled(mine);
    }

    [Fact]
    public async Task Handover_NeedsOpenShift_AndCashierOwnShift()
    {
        await SeedAsync();
        User kaan = await SeedStaffAsync("Kurye Kaan", UserRole.Courier);
        User kemal = await SeedStaffAsync("Kasiyer Kemal", UserRole.Cashier);
        User ayse = await SeedStaffAsync("Kasiyer Ayşe", UserRole.Cashier);
        DeliveryOrder delivery = await DeliveredAsync(kaan, PaymentMethod.Nakit);

        var (closed, _) = await SeedRegisterAsync(kemal.Id, openShift: false);
        var noShift = await HandoverAsync(kaan, closed, As(kemal, "Cashier"), delivery);
        Assert.Equal(HandoverCourierCashCommandHandler.NoOpenShiftMessage, noShift.Error);

        var (aysesRegister, _) = await SeedRegisterAsync(ayse.Id);
        var othersShift = await HandoverAsync(kaan, aysesRegister, As(kemal, "Cashier"), delivery);
        Assert.Equal(HandoverCourierCashCommandHandler.NotOwnShiftMessage, othersShift.Error);

        AssertNothingSettled(delivery);
    }

    [Fact]
    public async Task Handover_WhenBillChangedAfterAcceptance_IsRejected()
    {
        await SeedAsync();
        User kaan = await SeedStaffAsync("Kurye Kaan", UserRole.Courier);
        var (register, _) = await SeedRegisterAsync(CurrentUser.UserId);
        DeliveryOrder delivery = await DeliveredAsync(kaan, PaymentMethod.Nakit);
        LinkedOrder(delivery).AddItem(Ayran, 1, 10m);
        await DbContext.SaveChangesAsync();

        var result = await HandoverAsync(kaan, register, null, delivery);

        Assert.StartsWith("PAKET #1: hesap (₺250) kuryenin tahsil ettiği tutardan (₺220) farklı.", result.Error);
        AssertNothingSettled(delivery);
    }

    [Fact]
    public void Handover_Validator_RejectsEmptyAndDuplicateIds()
    {
        var validator = new HandoverCourierCashCommandValidator();
        Guid id = Guid.NewGuid();

        Assert.False(validator.Validate(new HandoverCourierCashCommand { CourierUserId = id, CashRegisterId = id }).IsValid);
        var duplicate = validator.Validate(new HandoverCourierCashCommand { CourierUserId = id, CashRegisterId = id, DeliveryOrderIds = [id, id] });
        Assert.Contains(duplicate.Errors, e => e.ErrorMessage == "Aynı sipariş birden fazla kez gönderilemez.");
    }

    private void AssertNothingSettled(DeliveryOrder delivery)
    {
        Assert.Null(delivery.SettledAt);
        Assert.False(LinkedOrder(delivery).IsClosed());
        Assert.DoesNotContain(DbContext.Payments, p => p.OrderId == delivery.OrderId);
    }
}
