using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.Delivery.Courier;
using RestaurantBill.Application.Features.Delivery.Settings;
using RestaurantBill.Application.Features.Delivery.Staff;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus;
using RestaurantBill.Application.Features.Shifts.Queries.GetShiftSummary;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.Delivery;

// Kurye kasası: "Teslim al"da nakit sayımı ve farkı, teslim geçmişi, önceki günden kalan tahsilat ve gün kapatırken
// kuryede kalan para uyarısının verisi. Sipariş: 2 Lahmacun (₺200) + ₺20 teslimat = ₺220.
public class CourierCashCountTests : DeliveryTestBase
{
    private sealed class DayOfClock : IBusinessDayResolver
    {
        public DateOnly ResolveBusinessDay(Branch branch, DateTime utcMoment) => DateOnly.FromDateTime(utcMoment);
        public (DateTime FromUtc, DateTime ToUtc) ToUtcRange(Branch branch, DateOnly from, DateOnly to)
            => (from.ToDateTime(TimeOnly.MinValue), to.AddDays(1).ToDateTime(TimeOnly.MinValue));
    }

    private sealed class ZeroBalanceCalculator : IShiftBalanceCalculator
    {
        public Task<decimal> CalculateExpectedClosingBalanceAsync(Shift shift, CancellationToken cancellationToken) => Task.FromResult(0m);
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

    private async Task<(CashRegister Register, Shift Shift)> SeedRegisterAsync()
    {
        CashRegister register = CashRegister.Create("Ana Kasa", 500m, Branch.Id);
        DbContext.CashRegisters.Add(register);
        await DbContext.SaveChangesAsync();
        Shift shift = Shift.Create(Branch.Id, register.Id, CurrentUser.UserId, 500m, 500m);
        DbContext.Shifts.Add(shift);
        await DbContext.SaveChangesAsync();
        return (register, shift);
    }

    private async Task<DeliveryOrder> DeliveredAsync(User courier, PaymentMethod method)
    {
        DeliveryOrder delivery = await SubmitOkAsync($"0532 000 00 {++_phoneSuffix:00}");
        await AcceptOkAsync(delivery);
        Result ready = await new UpdateOrderStatusCommandHandler(Db, TableNotifications, CashierNotifications, CurrentUser)
            .Handle(new UpdateOrderStatusCommand { OrderId = delivery.OrderId!.Value, Status = (int)OrderStatus.Ready }, CancellationToken.None);
        Assert.True(ready.IsSuccess, ready.Error);
        Result assigned = await new AssignCourierCommandHandler(Db, CurrentUser, CashierNotifications, CourierNotifications)
            .Handle(new AssignCourierCommand { Id = delivery.Id, CourierUserId = courier.Id }, CancellationToken.None);
        Assert.True(assigned.IsSuccess, assigned.Error);
        Result dispatched = await new DispatchDeliveryOrderCommandHandler(Db, CurrentUser, CashierNotifications, CourierNotifications, Clock)
            .Handle(new DispatchDeliveryOrderCommand { Id = delivery.Id }, CancellationToken.None);
        Assert.True(dispatched.IsSuccess, dispatched.Error);
        Result delivered = await new DeliverDeliveryOrderCommandHandler(Db, CurrentUser, CashierNotifications, CourierNotifications, Clock)
            .Handle(new DeliverDeliveryOrderCommand { Id = delivery.Id, Method = method }, CancellationToken.None);
        Assert.True(delivered.IsSuccess, delivered.Error);
        return delivery;
    }

    private Task<Result<CourierHandoverResultDto>> HandoverAsync(User courier, CashRegister register, decimal? counted, params DeliveryOrder[] orders)
        => new HandoverCourierCashCommandHandler(Db, CurrentUser, CashierNotifications, CourierNotifications, Clock)
            .Handle(new HandoverCourierCashCommand
            {
                CourierUserId = courier.Id,
                CashRegisterId = register.Id,
                DeliveryOrderIds = orders.Select(o => o.Id).ToList(),
                CountedCash = counted
            }, CancellationToken.None);

    private Task<Result<List<CourierHandoverHistoryDto>>> HistoryAsync()
        => new GetCourierHandoversQueryHandler(Db, CurrentUser, Clock).Handle(new GetCourierHandoversQuery(), CancellationToken.None);

    // ── Teslim al: sayım ve fark ───────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Handover_WithShortCount_StoresDifferenceOnEveryOrder_AuditsIt_AndHistoryShowsIt()
    {
        await SeedAsync();
        User kaan = await SeedCourierAsync("Kurye Kaan");
        var (register, _) = await SeedRegisterAsync();
        DeliveryOrder first = await DeliveredAsync(kaan, PaymentMethod.Nakit);
        DeliveryOrder second = await DeliveredAsync(kaan, PaymentMethod.Nakit);
        DeliveryOrder card = await DeliveredAsync(kaan, PaymentMethod.Kart);

        var result = await HandoverAsync(kaan, register, 430m, first, second, card);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(440m, result.Value!.ExpectedCash);
        Assert.Equal(430m, result.Value.CountedCash);
        Assert.Equal(-10m, result.Value.CashDifference);
        foreach (DeliveryOrder d in new[] { first, second, card })
        {
            Assert.Equal(430m, d.HandoverCountedCash);
            Assert.Equal(-10m, d.HandoverCashDifference);
        }
        Assert.Contains(DbContext.AuditLogs, a => a.Action == "CourierCashCountDifference" && a.Message.Contains("eksik"));

        var history = await HistoryAsync();
        Assert.True(history.IsSuccess, history.Error);
        CourierHandoverHistoryDto row = Assert.Single(history.Value!);
        Assert.Equal(kaan.Id, row.CourierUserId);
        Assert.Equal("Kurye Kaan", row.CourierName);
        Assert.Equal("Kasiyer Kemal", row.SettledByName);
        Assert.Equal(3, row.OrderCount);
        Assert.Equal(440m, row.ExpectedCash);
        Assert.Equal(220m, row.CardAmount);
        Assert.Equal(430m, row.CountedCash);
        Assert.Equal(-10m, row.CashDifference);
    }

    [Fact]
    public async Task Handover_ExactCount_HasZeroDifference_AndNoAudit()
    {
        await SeedAsync();
        User kaan = await SeedCourierAsync("Kurye Kaan");
        var (register, _) = await SeedRegisterAsync();
        DeliveryOrder delivery = await DeliveredAsync(kaan, PaymentMethod.Nakit);

        var result = await HandoverAsync(kaan, register, 220m, delivery);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(0m, result.Value!.CashDifference);
        Assert.Equal(0m, delivery.HandoverCashDifference);
        Assert.DoesNotContain(DbContext.AuditLogs, a => a.Action == "CourierCashCountDifference");
    }

    [Fact]
    public async Task Handover_CardOnly_IgnoresCount()
    {
        await SeedAsync();
        User kaan = await SeedCourierAsync("Kurye Kaan");
        var (register, _) = await SeedRegisterAsync();
        DeliveryOrder delivery = await DeliveredAsync(kaan, PaymentMethod.Kart);

        var result = await HandoverAsync(kaan, register, 50m, delivery);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Null(result.Value!.CashDifference);
        Assert.Null(delivery.HandoverCountedCash);
        Assert.Null(delivery.HandoverCashDifference);
    }

    [Fact]
    public async Task Handover_WithoutCount_StillSettles_AndHistoryHasNoDifference()
    {
        await SeedAsync();
        User kaan = await SeedCourierAsync("Kurye Kaan");
        var (register, _) = await SeedRegisterAsync();
        DeliveryOrder delivery = await DeliveredAsync(kaan, PaymentMethod.Nakit);

        var result = await HandoverAsync(kaan, register, null, delivery);

        Assert.True(result.IsSuccess, result.Error);
        Assert.NotNull(delivery.SettledAt);
        Assert.Null(delivery.HandoverCashDifference);
        CourierHandoverHistoryDto row = Assert.Single((await HistoryAsync()).Value!);
        Assert.Equal(220m, row.ExpectedCash);
        Assert.Null(row.CountedCash);
        Assert.Null(row.CashDifference);
    }

    [Fact]
    public async Task History_SeparatesHandovers_NewestFirst_AndSkipsOldOnes()
    {
        await SeedAsync();
        User kaan = await SeedCourierAsync("Kurye Kaan");
        var (register, _) = await SeedRegisterAsync();
        DeliveryOrder old = await DeliveredAsync(kaan, PaymentMethod.Nakit);
        Assert.True((await HandoverAsync(kaan, register, 220m, old)).IsSuccess);

        Clock.Now = Clock.Now.AddDays(10);
        DeliveryOrder first = await DeliveredAsync(kaan, PaymentMethod.Nakit);
        Assert.True((await HandoverAsync(kaan, register, 225m, first)).IsSuccess);
        Clock.Now = Clock.Now.AddMinutes(30);
        DeliveryOrder second = await DeliveredAsync(kaan, PaymentMethod.Nakit);
        Assert.True((await HandoverAsync(kaan, register, 200m, second)).IsSuccess);

        var history = (await HistoryAsync()).Value!;

        Assert.Equal(2, history.Count);
        Assert.Equal(-20m, history[0].CashDifference);
        Assert.Equal(5m, history[1].CashDifference);
    }

    [Fact]
    public void Validator_RejectsNegativeCount()
    {
        var validator = new HandoverCourierCashCommandValidator();
        var command = new HandoverCourierCashCommand
        {
            CourierUserId = Guid.NewGuid(), CashRegisterId = Guid.NewGuid(), DeliveryOrderIds = [Guid.NewGuid()], CountedCash = -1m
        };

        Assert.False(validator.Validate(command).IsValid);
        command.CountedCash = 0m;
        Assert.True(validator.Validate(command).IsValid);
        command.CountedCash = null;
        Assert.True(validator.Validate(command).IsValid);
    }

    // ── Önceki günden kalan tahsilat ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Couriers_FlagPreviousDayCollections()
    {
        await SeedAsync();
        User kaan = await SeedCourierAsync("Kurye Kaan");
        DeliveryOrder yesterday = await DeliveredAsync(kaan, PaymentMethod.Nakit);
        DateTime? yesterdayCollectedAt = yesterday.CollectedAt;
        Clock.Now = Clock.Now.AddDays(1);
        DeliveryOrder today = await DeliveredAsync(kaan, PaymentMethod.Kart);

        var couriers = await new GetCouriersQueryHandler(Db, CurrentUser, new DayOfClock(), Clock)
            .Handle(new GetCouriersQuery(), CancellationToken.None);

        Assert.True(couriers.IsSuccess, couriers.Error);
        CourierSummaryDto summary = Assert.Single(couriers.Value!);
        Assert.Equal(220m, summary.PreviousDayCash);
        Assert.Equal(1, summary.PreviousDayOrderCount);
        Assert.Equal(yesterdayCollectedAt, summary.OldestCollectedAt);
        CourierOutstandingOrderDto old = summary.OutstandingOrders.Single(o => o.DeliveryOrderId == yesterday.Id);
        Assert.True(old.IsFromPreviousDay);
        Assert.Equal(yesterdayCollectedAt, old.CollectedAt);
        Assert.False(summary.OutstandingOrders.Single(o => o.DeliveryOrderId == today.Id).IsFromPreviousDay);
    }

    // ── Gün kapatırken kuryede kalan para ──────────────────────────────────────────────────────────

    [Fact]
    public async Task ShiftSummary_ListsCouriersWithUnsettledCollections()
    {
        await SeedAsync();
        User kaan = await SeedCourierAsync("Kurye Kaan");
        User mert = await SeedCourierAsync("Kurye Mert");
        var (register, shift) = await SeedRegisterAsync();
        await DeliveredAsync(kaan, PaymentMethod.Nakit);
        await DeliveredAsync(kaan, PaymentMethod.Kart);
        DeliveryOrder settled = await DeliveredAsync(mert, PaymentMethod.Nakit);
        Assert.True((await HandoverAsync(mert, register, 220m, settled)).IsSuccess);

        var result = await new GetShiftSummaryQueryHandler(Db, CurrentUser, new ZeroBalanceCalculator())
            .Handle(new GetShiftSummaryQuery { ShiftId = shift.Id }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        ShiftCourierCashDto courier = Assert.Single(result.Value!.CouriersWithUnsettledCash);
        Assert.Equal(kaan.Id, courier.CourierUserId);
        Assert.Equal("Kurye Kaan", courier.FullName);
        Assert.Equal(220m, courier.Cash);
        Assert.Equal(1, courier.CashOrderCount);
        Assert.Equal(220m, courier.Card);
        Assert.Equal(1, courier.CardOrderCount);
    }
}

// Engelli numaralar: geri çevrilen denemelerin sayısı ve engelin geldiği sipariş.
public class BlockedPhoneAttemptTests : DeliveryTestBase
{
    [Fact]
    public async Task Submit_FromBlockedPhone_CountsEachRejectedAttempt()
    {
        await SeedAsync();
        DbContext.BlockedPhones.Add(BlockedPhone.Create(Branch.Id, Phone, "Sahte", CurrentUser.UserId));
        await DbContext.SaveChangesAsync();

        for (int i = 0; i < 2; i++)
        {
            var command = Submit(220m, ProductLine(Lahmacun, 2));
            command.ClientRequestId = Guid.NewGuid();
            var result = await SubmitAsync(command);
            Assert.Equal(BlockedPhone.CustomerMessage, result.Error);
        }

        BlockedPhone blocked = DbContext.BlockedPhones.Single();
        Assert.Equal(2, blocked.BlockedAttemptCount);
        Assert.Equal(Clock.Now.UtcDateTime, blocked.LastBlockedAttemptAt);
        Assert.Empty(DbContext.DeliveryOrders);

        var list = await new GetBlockedPhonesQueryHandler(Db, CurrentUser).Handle(new GetBlockedPhonesQuery(), CancellationToken.None);
        BlockedPhoneDto dto = Assert.Single(list.Value!);
        Assert.Equal(2, dto.BlockedAttemptCount);
        Assert.Null(dto.SourceDeliveryOrderNumber);
    }

    [Fact]
    public async Task BlockFromOrder_RemembersSourceOrder_AndListShowsItsNumber()
    {
        await SeedAsync();
        DeliveryOrder delivery = await SubmitOkAsync();

        var blocked = await new BlockDeliveryOrderPhoneCommandHandler(Db, CurrentUser)
            .Handle(new BlockDeliveryOrderPhoneCommand { DeliveryOrderId = delivery.Id }, CancellationToken.None);

        Assert.True(blocked.IsSuccess, blocked.Error);
        Assert.Equal(delivery.Id, blocked.Value!.SourceDeliveryOrderId);
        Assert.Equal(delivery.Number, blocked.Value.SourceDeliveryOrderNumber);
        Assert.Equal(delivery.Id, DbContext.BlockedPhones.Single().SourceDeliveryOrderId);

        var list = await new GetBlockedPhonesQueryHandler(Db, CurrentUser).Handle(new GetBlockedPhonesQuery(), CancellationToken.None);
        BlockedPhoneDto dto = Assert.Single(list.Value!);
        Assert.Equal(delivery.Id, dto.SourceDeliveryOrderId);
        Assert.Equal(delivery.Number, dto.SourceDeliveryOrderNumber);
        Assert.Equal(0, dto.BlockedAttemptCount);
    }
}
