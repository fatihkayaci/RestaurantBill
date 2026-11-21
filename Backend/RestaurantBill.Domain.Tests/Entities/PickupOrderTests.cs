using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

// Gel al: Received → Accepted → Preparing → Ready → Delivered ("Müşteri aldı"); adres, bölge, teslimat ücreti ve kurye yok.
public class PickupOrderTests
{
    private static readonly Guid BranchId = Guid.NewGuid();
    private static readonly Guid StaffId = Guid.NewGuid();
    private static readonly DateTime Now = new(2026, 11, 21, 12, 0, 0, DateTimeKind.Utc);

    private static void SetId(BaseEntity entity, Guid id) =>
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private static DeliveryOrder Received(PaymentMethod payment = PaymentMethod.Nakit)
    {
        DeliveryOrder order = DeliveryOrder.CreatePickup(BranchId, 3, Guid.NewGuid(), " Ayşe Yılmaz ", "0532 123 45 67", " acısız ", payment, "10.0.0.1");
        Product product = Product.Create("Lahmacun", 90m, "", Guid.NewGuid());
        SetId(product, Guid.NewGuid());
        order.AddProductLine(product, 80m, 10m, 2, null);
        return order;
    }

    private static DeliveryOrder Accepted(PaymentMethod payment = PaymentMethod.Nakit)
    {
        DeliveryOrder order = Received(payment);
        Order kitchen = Order.CreatePickup(BranchId, order.Note);
        SetId(kitchen, Guid.NewGuid());
        order.Accept(kitchen, 15, StaffId, Now);
        return order;
    }

    [Fact]
    public void CreatePickup_HasNoAddressZoneOrFee()
    {
        DeliveryOrder order = Received();

        Assert.True(order.IsPickup);
        Assert.Equal(OrderType.Takeaway, order.OrderType);
        Assert.Equal(string.Empty, order.Address);
        Assert.Null(order.DeliveryZoneId);
        Assert.Equal(0m, order.DeliveryFee);
        Assert.Equal(160m, order.Subtotal);
        Assert.Equal(160m, order.Total);
        Assert.Equal("Ayşe Yılmaz", order.CustomerName);
        Assert.Equal("+905321234567", order.CustomerPhone);
        Assert.Equal("acısız", order.Note);
    }

    [Theory]
    [InlineData("", "0532 123 45 67")]
    [InlineData("Ayşe", "123")]
    public void CreatePickup_StillRequiresNameAndPhone(string name, string phone)
    {
        Assert.Throws<DomainException>(() =>
            DeliveryOrder.CreatePickup(BranchId, 1, Guid.NewGuid(), name, phone, null, PaymentMethod.Nakit, null));
    }

    [Fact]
    public void OrderCreatePickup_IsTakeaway_WithoutTableOrFee_AndClosesWithoutFeeSettlement()
    {
        Order order = Order.CreatePickup(BranchId, "not");

        Assert.Equal(OrderType.Takeaway, order.OrderType);
        Assert.True(order.IsPackageOrder);
        Assert.False(order.HasTable);
        Assert.Equal(0m, order.DeliveryFee);
        Assert.Throws<DomainException>(() => order.SettleDeliveryFee());

        order.Close();
        Assert.Equal(OrderStatus.Paid, order.Status);
    }

    [Fact]
    public void Accept_RequiresTakeawayOrder()
    {
        DeliveryOrder order = Received();
        Assert.Throws<DomainException>(() => order.Accept(Order.CreateDelivery(BranchId, 0m), 15, StaffId, Now));

        DeliveryOrder delivery = DeliveryOrder.Create(BranchId, 4, Guid.NewGuid(), "Ali", "0532 123 45 67", "Moda", null, null,
            Zone(), PaymentMethod.Nakit, null);
        Product product = Product.Create("Ayran", 30m, "", Guid.NewGuid());
        delivery.AddProductLine(product, 30m, 10m, 1, null);
        Assert.Throws<DomainException>(() => delivery.Accept(Order.CreatePickup(BranchId), 15, StaffId, Now));
    }

    [Fact]
    public void Pickup_HasNoCourierFlow()
    {
        DeliveryOrder order = Accepted();
        order.AdvanceFromKitchen(OrderStatus.Ready);

        Assert.Equal(DeliveryOrder.PickupNoCourierMessage, Assert.Throws<DomainException>(() => order.AssignCourier(Guid.NewGuid())).Message);
        Assert.Throws<DomainException>(() => order.UnassignCourier());
        Assert.Throws<DomainException>(() => order.Dispatch(Now));
        Assert.Throws<DomainException>(() => order.Deliver(PaymentMethod.Nakit, Now));
    }

    [Fact]
    public void StatusFlow_KitchenReady_ThenCompletePickup_SettlesAtOnce()
    {
        DeliveryOrder order = Accepted();
        Assert.True(order.AdvanceFromKitchen(OrderStatus.Preparing));
        Assert.True(order.AdvanceFromKitchen(OrderStatus.Ready));
        Assert.Equal(DeliveryOrderStatus.Ready, order.Status);

        order.CompletePickup(PaymentMethod.Kart, 160m, StaffId, Now);

        Assert.Equal(DeliveryOrderStatus.Delivered, order.Status);
        Assert.Equal(Now, order.DeliveredAt);
        Assert.Equal(PaymentMethod.Kart, order.CollectedMethod);
        Assert.Equal(160m, order.CollectedAmount);
        Assert.True(order.IsSettled);
        Assert.Equal(StaffId, order.SettledByUserId);
        Assert.False(order.IsOpen);
        // Kasaya geçmiş teslim geri alınamaz, ikinci kez verilemez.
        Assert.Null(order.UndoDeliverDeadline());
        Assert.Throws<DomainException>(() => order.UndoDeliver(Now));
        Assert.Throws<DomainException>(() => order.CompletePickup(PaymentMethod.Kart, 160m, StaffId, Now));
    }

    [Fact]
    public void CompletePickup_AllowedBeforeKitchenReady_ButNotBeforeAccept_OrForDelivery()
    {
        Assert.Throws<DomainException>(() => Received().CompletePickup(PaymentMethod.Nakit, 160m, StaffId, Now));

        DeliveryOrder accepted = Accepted();
        accepted.CompletePickup(PaymentMethod.Nakit, 160m, StaffId, Now);
        Assert.Equal(DeliveryOrderStatus.Delivered, accepted.Status);

        DeliveryOrder delivery = DeliveryOrder.Create(BranchId, 5, Guid.NewGuid(), "Ali", "0532 123 45 67", "Moda", null, null,
            Zone(), PaymentMethod.Nakit, null);
        Assert.Throws<DomainException>(() => delivery.CompletePickup(PaymentMethod.Nakit, 0m, StaffId, Now));
    }

    [Fact]
    public void CompletePickup_Iban_OnlyWhenCustomerChoseIban()
    {
        Assert.Throws<DomainException>(() => Accepted(PaymentMethod.Nakit).CompletePickup(PaymentMethod.Iban, 160m, StaffId, Now));

        DeliveryOrder iban = Accepted(PaymentMethod.Iban);
        iban.CompletePickup(PaymentMethod.Iban, 160m, StaffId, Now);
        Assert.Equal(PaymentMethod.Iban, iban.CollectedMethod);
    }

    [Fact]
    public void Settings_PickupDefaultsOff_AndValidatesReadyTime()
    {
        OnlineOrderSettings defaults = OnlineOrderSettings.Default(null, null);
        Assert.False(defaults.PickupEnabled);
        Assert.Equal(OnlineOrderSettings.DefaultPickupEta, defaults.PickupEtaMinutes);

        var days = ReservationSettings.WeekOrder.Select(d => new OnlineOrderDayHours(d, true, new TimeOnly(11, 0), new TimeOnly(22, 0))).ToList();
        OnlineOrderSettings on = OnlineOrderSettings.Create(true, days, 30, 45, 10, 2, 5, true, true, false, false, 60,
            pickupEnabled: true, pickupEtaMinutes: 25);
        Assert.True(on.PickupEnabled);
        Assert.Equal(25, on.PickupEtaMinutes);
        // IBAN anahtarı değişince gel al korunur.
        Assert.True(on.WithAcceptIban(true).PickupEnabled);

        Assert.Throws<DomainException>(() => OnlineOrderSettings.Create(true, days, 30, 45, 10, 2, 5, true, true, false, false, 60,
            pickupEnabled: true, pickupEtaMinutes: 5));
    }

    private static DeliveryZone Zone()
    {
        DeliveryZone zone = DeliveryZone.Create(BranchId, "Moda", 25m, 0m, 40, 0);
        SetId(zone, Guid.NewGuid());
        return zone;
    }
}
