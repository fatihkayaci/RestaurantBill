using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Features.Delivery.Public;
using RestaurantBill.Application.Features.Delivery.Settings;
using RestaurantBill.Application.Features.Delivery.Staff;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus;
using RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToKitchen;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.Delivery;

// "Gel al": müşteri online sipariş verir, restorana gelip kendisi alır. Adres, bölge, teslimat ücreti ve bölgenin en az
// tutarı yoktur; kurye atanmaz; "Müşteri aldı" ödemeyi kasiyerin vardiyasına yazar ve siparişi kapatır.
public class PickupOrderTests : DeliveryTestBase
{
    private Task SeedPickupAsync(bool pickupEnabled = true) => SeedAsync(Settings(pickupEnabled: pickupEnabled, pickupEtaMinutes: 15));

    private SubmitDeliveryOrderCommand SubmitPickup(decimal expectedTotal, params CartLineInput[] lines) => new()
    {
        ClientRequestId = Guid.NewGuid(),
        Pickup = true,
        Lines = lines.ToList(),
        CustomerName = "Ahmet Yılmaz",
        Phone = Phone,
        Note = "Acısız olsun",
        PaymentMethod = PaymentMethod.Nakit,
        ExpectedTotal = expectedTotal
    };

    /// <summary>2 Lahmacun = ₺200, teslimat ücreti yok.</summary>
    private async Task<DeliveryOrder> SubmitPickupOkAsync()
    {
        var result = await SubmitAsync(SubmitPickup(200m, ProductLine(Lahmacun, 2)));
        Assert.True(result.IsSuccess, result.Error);
        Assert.False(result.Value!.PriceChanged);
        return DbContext.DeliveryOrders.Single(d => d.AccessToken == result.Value.Token);
    }

    private Order LinkedOrder(DeliveryOrder delivery) => DbContext.Orders.Single(o => o.Id == delivery.OrderId);

    private async Task<(CashRegister Register, Shift Shift)> SeedRegisterAsync(bool openShift = true)
    {
        CashRegister register = CashRegister.Create("Ana Kasa", 500m, Branch.Id);
        DbContext.CashRegisters.Add(register);
        await DbContext.SaveChangesAsync();

        Shift shift = Shift.Create(Branch.Id, register.Id, CurrentUser.UserId, 500m, 500m);
        if (openShift)
        {
            DbContext.Shifts.Add(shift);
            await DbContext.SaveChangesAsync();
        }
        return (register, shift);
    }

    private Task<Result> CompleteAsync(DeliveryOrder delivery, CashRegister register, PaymentMethod method = PaymentMethod.Nakit)
        => new CompletePickupCommandHandler(Db, CurrentUser, CashierNotifications, KitchenNotifications, Clock)
            .Handle(new CompletePickupCommand { Id = delivery.Id, CashRegisterId = register.Id, Method = method }, CancellationToken.None);

    private async Task<DeliveryTrackingDto> TrackingAsync(DeliveryOrder delivery)
    {
        var result = await new GetDeliveryTrackingQueryHandler(Db, Tenant).Handle(new GetDeliveryTrackingQuery { Token = delivery.AccessToken }, CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);
        return result.Value!;
    }

    // ── Müşteri tarafı ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task OnlineOrdering_ShowsPickupOption_WithBranchAddressAndReadyTime()
    {
        await SeedPickupAsync();
        Branch.Update(Branch.BranchName, "", Branch.Number, "", "İstanbul", "Kadıköy", "Moda Cad. No:5", 10m);
        await DbContext.SaveChangesAsync();

        var result = await new GetOnlineOrderingQueryHandler(Db, Tenant, Options.Create(new BunnyStorageOptions()), Sms, Clock)
            .Handle(new GetOnlineOrderingQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.True(result.Value!.PickupEnabled);
        Assert.Equal(15, result.Value.PickupEtaMinutes);
        Assert.Equal("Moda Cad. No:5, Kadıköy / İstanbul", result.Value.PickupAddress);
    }

    [Fact]
    public async Task Submit_Pickup_NeedsNoAddressOrZone_HasNoFee_AndSkipsZoneMinimum()
    {
        await SeedPickupAsync();

        // Moda'nın en az tutarı ₺100; gel al'da uygulanmaz (tek Ayran ₺30).
        var result = await SubmitAsync(SubmitPickup(30m, ProductLine(Ayran)));

        Assert.True(result.IsSuccess, result.Error);
        DeliveryOrder delivery = DbContext.DeliveryOrders.Single();
        Assert.True(delivery.IsPickup);
        Assert.Equal(OrderType.Takeaway, delivery.OrderType);
        Assert.Equal(0m, delivery.DeliveryFee);
        Assert.Equal(30m, delivery.Total);
        Assert.Null(delivery.DeliveryZoneId);
        Assert.Equal(string.Empty, delivery.Address);
        Assert.Equal(string.Empty, delivery.ZoneName);
        Assert.Equal(NormalizedPhone, delivery.CustomerPhone);
        Assert.Contains(DbContext.AuditLogs, a => a.Action == "DeliveryOrderReceived" && a.Message.Contains("gel al"));
    }

    [Fact]
    public async Task Quote_Pickup_IgnoresZone_NoFee_AndUsesPickupReadyTime()
    {
        await SeedPickupAsync();

        var quote = await QuoteHandler().Handle(new QuoteDeliveryOrderCommand { ZoneId = Moda.Id, Pickup = true, Lines = [ProductLine(Ayran)] },
            CancellationToken.None);

        Assert.True(quote.IsSuccess, quote.Error);
        Assert.Equal(0m, quote.Value!.DeliveryFee);
        Assert.Equal(30m, quote.Value.Total);
        Assert.True(quote.Value.MeetsMinimum);
        Assert.Equal(15, quote.Value.EstimatedMinutes);
    }

    [Fact]
    public async Task Submit_And_Quote_Pickup_AreRejected_WhenSettingDisabled()
    {
        await SeedPickupAsync(pickupEnabled: false);

        var submit = await SubmitAsync(SubmitPickup(200m, ProductLine(Lahmacun, 2)));
        Assert.True(submit.IsFailure);
        Assert.Equal(DeliveryScope.PickupDisabledMessage, submit.Error);
        Assert.Empty(DbContext.DeliveryOrders);

        var quote = await QuoteHandler().Handle(new QuoteDeliveryOrderCommand { Pickup = true, Lines = [ProductLine(Lahmacun)] }, CancellationToken.None);
        Assert.True(quote.IsFailure);
        Assert.Equal(DeliveryScope.PickupDisabledMessage, quote.Error);
    }

    [Fact]
    public void Validator_Pickup_DoesNotRequireAddressOrZone_ButDeliveryDoes()
    {
        var validator = new SubmitDeliveryOrderCommandValidator();
        var pickup = new SubmitDeliveryOrderCommand
        {
            ClientRequestId = Guid.NewGuid(), Pickup = true, Lines = [ProductLine(Product.Create("Ayran", 30m, "", Guid.NewGuid()))],
            CustomerName = "Ahmet", Phone = Phone, PaymentMethod = PaymentMethod.Kart
        };
        pickup.Lines[0].ProductId = Guid.NewGuid();
        Assert.True(validator.Validate(pickup).IsValid);

        pickup.Pickup = false;
        var delivery = validator.Validate(pickup);
        Assert.False(delivery.IsValid);
        Assert.Contains(delivery.Errors, e => e.ErrorMessage == "Teslimat bölgenizi seçin.");
        Assert.Contains(delivery.Errors, e => e.ErrorMessage == "Adresinizi girin.");

        pickup.Pickup = true;
        pickup.CustomerName = "";
        Assert.False(validator.Validate(pickup).IsValid);
    }

    // ── Personel ve mutfak ─────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Accept_OpensTakeawayOrder_WithoutFee_KitchenTicketSaysGelAl_AndSuggestsPickupEta()
    {
        await SeedPickupAsync();
        DeliveryOrder delivery = await SubmitPickupOkAsync();

        var staffDto = await new GetDeliveryOrderQueryHandler(Db, CurrentUser).Handle(new GetDeliveryOrderQuery { Id = delivery.Id }, CancellationToken.None);
        Assert.True(staffDto.IsSuccess, staffDto.Error);
        Assert.True(staffDto.Value!.IsPickup);
        Assert.Equal(OrderType.Takeaway, staffDto.Value.OrderType);
        Assert.Equal(15, staffDto.Value.SuggestedEtaMinutes);

        await AcceptOkAsync(delivery);

        Assert.Equal(15, delivery.EstimatedMinutes);
        Order order = LinkedOrder(delivery);
        Assert.Equal(OrderType.Takeaway, order.OrderType);
        Assert.Null(order.TableId);
        Assert.Equal(0m, order.DeliveryFee);
        Assert.Equal(200m, order.TotalPrice);

        var kitchen = await new GetAllOrdersToKitchenQueryHandler(Db, CurrentUser).Handle(new GetAllOrdersToKitchenQuery(), CancellationToken.None);
        OrderDto ticket = Assert.Single(kitchen.Value!);
        Assert.Equal("GEL AL #1", ticket.TableName);
        Assert.Equal(OrderType.Takeaway, ticket.OrderType);
    }

    [Fact]
    public async Task Pickup_CannotGetCourier()
    {
        await SeedPickupAsync();
        DeliveryOrder delivery = await SubmitPickupOkAsync();
        await AcceptOkAsync(delivery);

        var assign = await new AssignCourierCommandHandler(Db, CurrentUser, CashierNotifications, CourierNotifications)
            .Handle(new AssignCourierCommand { Id = delivery.Id, CourierUserId = null }, CancellationToken.None);

        Assert.True(assign.IsFailure);
        Assert.Equal(DeliveryOrder.PickupNoCourierMessage, assign.Error);
    }

    [Fact]
    public async Task StatusFlow_KitchenReady_ThenCustomerPicksUp_PaymentGoesToShift_AndOrderCloses()
    {
        await SeedPickupAsync();
        DeliveryOrder delivery = await SubmitPickupOkAsync();
        await AcceptOkAsync(delivery);
        Order order = LinkedOrder(delivery);
        var (register, shift) = await SeedRegisterAsync();

        var statusHandler = new UpdateOrderStatusCommandHandler(Db, TableNotifications, CashierNotifications, CurrentUser);
        Result ready = await statusHandler.Handle(new UpdateOrderStatusCommand { OrderId = order.Id, Status = (int)OrderStatus.Ready }, CancellationToken.None);
        Assert.True(ready.IsSuccess, ready.Error);
        Assert.Equal(DeliveryOrderStatus.Ready, delivery.Status);

        DeliveryTrackingDto readyTracking = await TrackingAsync(delivery);
        Assert.True(readyTracking.IsPickup);
        Assert.Equal("Hazır, gelip alabilirsiniz", readyTracking.StatusLabel);

        Result done = await CompleteAsync(delivery, register, PaymentMethod.Nakit);

        Assert.True(done.IsSuccess, done.Error);
        Assert.Equal(DeliveryOrderStatus.Delivered, delivery.Status);
        Assert.Equal(PaymentMethod.Nakit, delivery.CollectedMethod);
        Assert.Equal(200m, delivery.CollectedAmount);
        Assert.True(delivery.IsSettled);
        Assert.Equal(CurrentUser.UserId, delivery.SettledByUserId);
        Assert.Equal(OrderStatus.Paid, order.Status);

        Payment payment = Assert.Single(DbContext.Payments.Where(p => p.OrderId == order.Id).ToList());
        Assert.False(payment.IsDeliveryFee);
        Assert.Equal(200m, payment.TotalAmount);
        Assert.Equal(shift.Id, payment.ShiftId);
        Assert.Equal(CurrentUser.UserId, payment.UserId);
        CashTransaction cash = Assert.Single(DbContext.CashTransactions);
        Assert.Equal(200m, cash.Amount);
        Assert.Equal(700m, register.Balance);
        Assert.Contains(DbContext.AuditLogs, a => a.Action == "PickupOrderCompleted" && a.EntityId == delivery.Id);

        var staffDto = await new GetDeliveryOrderQueryHandler(Db, CurrentUser).Handle(new GetDeliveryOrderQuery { Id = delivery.Id }, CancellationToken.None);
        Assert.Equal("Müşteri aldı", staffDto.Value!.StatusLabel);
        Assert.Equal("Teslim alındı", (await TrackingAsync(delivery)).StatusLabel);

        // İkinci kez verilemez.
        Assert.True((await CompleteAsync(delivery, register)).IsFailure);
    }

    [Fact]
    public async Task CompletePickup_CardPayment_WritesNoCashTransaction_AndWorksBeforeKitchenReady()
    {
        await SeedPickupAsync();
        DeliveryOrder delivery = await SubmitPickupOkAsync();
        await AcceptOkAsync(delivery);
        var (register, _) = await SeedRegisterAsync();

        Result done = await CompleteAsync(delivery, register, PaymentMethod.Kart);

        Assert.True(done.IsSuccess, done.Error);
        Assert.Equal(DeliveryOrderStatus.Delivered, delivery.Status);
        Assert.Equal(PaymentMethod.Kart, Assert.Single(DbContext.Payments).PaymentMethod);
        Assert.Empty(DbContext.CashTransactions);
    }

    [Fact]
    public async Task CompletePickup_IsRejected_ForDeliveryOrders_NotAccepted_OrWithoutOpenShift()
    {
        await SeedPickupAsync();
        DeliveryOrder pickup = await SubmitPickupOkAsync();
        var (closed, _) = await SeedRegisterAsync(openShift: false);

        // Onaylanmamış gel al siparişi verilemez.
        Assert.True((await CompleteAsync(pickup, closed)).IsFailure);

        await AcceptOkAsync(pickup);
        Result noShift = await CompleteAsync(pickup, closed);
        Assert.Equal(HandoverCourierCashCommandHandler.NoOpenShiftMessage, noShift.Error);

        // Adrese teslim sipariş kurye teslimiyle kapanır.
        DeliveryOrder delivery = await SubmitOkAsync(phone: "0533 111 22 33");
        await AcceptOkAsync(delivery);
        var (open, _) = await SeedRegisterAsync();
        Result notPickup = await CompleteAsync(delivery, open);
        Assert.Equal(CompletePickupCommandHandler.NotPickupMessage, notPickup.Error);
        Assert.Empty(DbContext.Payments);
    }

    // ── Ayar ───────────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateSettings_SavesPickup_AndOldClientWithoutField_KeepsIt()
    {
        await SeedAsync();
        var handler = new UpdateOnlineOrderSettingsCommandHandler(Db, CurrentUser, Sms);
        UpdateOnlineOrderSettingsCommand Command(bool? pickup, int? eta) => new()
        {
            Enabled = true,
            Days = ReservationSettings.WeekOrder.Select(d => new OnlineOrderDayDto { Day = (int)d, IsOpen = true, Opens = "11:00", Closes = "22:00" }).ToList(),
            LastOrderMinutesBeforeClose = 30,
            DefaultEtaMinutes = 45,
            AutoRejectAfterMinutes = 10,
            MaxOpenOrdersPerPhone = 2,
            MaxOrdersPerPhonePerDay = 5,
            AcceptCash = true,
            AcceptCard = true,
            PreOrderLeadMinutes = 60,
            PickupEnabled = pickup,
            PickupEtaMinutes = eta
        };

        var on = await handler.Handle(Command(true, 25), CancellationToken.None);
        Assert.True(on.IsSuccess, on.Error);
        Assert.True(on.Value!.PickupEnabled);
        Assert.Equal(25, on.Value.PickupEtaMinutes);
        Assert.True(Branch.OffersPickup);

        var kept = await handler.Handle(Command(null, null), CancellationToken.None);
        Assert.True(kept.IsSuccess, kept.Error);
        Assert.True(kept.Value!.PickupEnabled);
        Assert.Equal(25, kept.Value.PickupEtaMinutes);

        var badEta = await handler.Handle(Command(true, 5), CancellationToken.None);
        Assert.True(badEta.IsFailure);
    }
}
