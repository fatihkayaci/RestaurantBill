using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

// Durumlar: Received → Accepted → Preparing → Ready → OnTheWay → Delivered; Received → Rejected | Cancelled (müşteri);
// Accepted…OnTheWay → Cancelled (personel).
public class DeliveryOrderTests
{
    private static readonly Guid BranchId = Guid.NewGuid();
    private static readonly Guid StaffId = Guid.NewGuid();
    private static readonly DateTime Now = new(2026, 11, 14, 12, 0, 0, DateTimeKind.Utc);

    private static void SetId(BaseEntity entity, Guid id) =>
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private static DeliveryZone Zone(decimal fee = 25m)
    {
        DeliveryZone zone = DeliveryZone.Create(BranchId, "Moda", fee, 150m, 40, 0);
        SetId(zone, Guid.NewGuid());
        return zone;
    }

    private static DeliveryOrder Received(decimal fee = 25m)
    {
        DeliveryOrder order = DeliveryOrder.Create(BranchId, 7, Guid.NewGuid(), " Ayşe Yılmaz ", "0532 123 45 67",
            "Moda Cd. 1", "Zil 3", null, Zone(fee), PaymentMethod.Nakit, "10.0.0.1");
        Product product = Product.Create("Lahmacun", 90m, "", Guid.NewGuid());
        SetId(product, Guid.NewGuid());
        order.AddProductLine(product, 80m, 10m, 2, "acısız");
        return order;
    }

    private static DeliveryOrder Accepted()
    {
        DeliveryOrder order = Received();
        order.Accept(Order.CreateDelivery(BranchId, order.DeliveryFee), 40, StaffId, Now);
        return order;
    }

    private static DeliveryOrder Ready()
    {
        DeliveryOrder order = Accepted();
        order.AdvanceFromKitchen(OrderStatus.Ready);
        return order;
    }

    private static DeliveryOrder OnTheWay()
    {
        DeliveryOrder order = Ready();
        order.AssignCourier(Guid.NewGuid());
        order.Dispatch(Now);
        return order;
    }

    [Fact]
    public void Create_SnapshotsZone_NormalizesPhone_AndUsesSnapshotPricesForTotals()
    {
        DeliveryOrder order = Received(fee: 25m);

        Assert.Equal(DeliveryOrderStatus.Received, order.Status);
        Assert.Equal("Ayşe Yılmaz", order.CustomerName);
        Assert.Equal("+905321234567", order.CustomerPhone);
        Assert.Equal("Moda", order.ZoneName);
        Assert.Equal(160m, order.Subtotal);
        Assert.Equal(185m, order.Total);
        DeliveryOrderLine line = Assert.Single(order.Lines);
        Assert.Equal("Lahmacun", line.NameSnapshot);
        Assert.Equal(80m, line.UnitPrice);
        Assert.Equal(32, order.AccessToken.Length);
        Assert.NotEqual(order.AccessToken, Received().AccessToken);
    }

    [Fact]
    public void Create_RejectsInvalidPhoneAndOnlineOnlyPayment()
    {
        Assert.Throws<DomainException>(() => DeliveryOrder.Create(BranchId, 1, Guid.NewGuid(), "A", "123", "Adres", null, null, Zone(), PaymentMethod.Nakit, null));
        Assert.Throws<DomainException>(() => DeliveryOrder.Create(BranchId, 1, Guid.NewGuid(), "A", "05321234567", "Adres", null, null, Zone(), PaymentMethod.Qr, null));
    }

    [Fact]
    public void AddLine_RejectsTotalAboveLimit_AndKeepsTotalsUnchanged()
    {
        DeliveryOrder order = Received();
        Product product = Product.Create("Kuzu", 500m, "", Guid.NewGuid());

        Assert.Throws<DomainException>(() => order.AddProductLine(product, 1000m, 10m, DeliveryOrder.MaxQuantity, null));
        Assert.Single(order.Lines);
        Assert.Equal(185m, order.Total);
    }

    [Fact]
    public void HappyPath_WalksEveryStatus_AndRecordsCollection()
    {
        DeliveryOrder order = Received();
        Order kitchenOrder = Order.CreateDelivery(BranchId, order.DeliveryFee);

        order.Accept(kitchenOrder, 40, StaffId, Now);
        Assert.Equal(DeliveryOrderStatus.Accepted, order.Status);
        Assert.Same(kitchenOrder, order.Order);

        Assert.True(order.AdvanceFromKitchen(OrderStatus.Preparing));
        Assert.Equal(DeliveryOrderStatus.Preparing, order.Status);
        Assert.True(order.AdvanceFromKitchen(OrderStatus.Ready));
        Assert.Equal(DeliveryOrderStatus.Ready, order.Status);

        Guid courier = Guid.NewGuid();
        order.AssignCourier(courier);
        order.Dispatch(Now.AddMinutes(20));
        Assert.Equal(DeliveryOrderStatus.OnTheWay, order.Status);

        order.Deliver(PaymentMethod.Kart, Now.AddMinutes(35));
        Assert.Equal(DeliveryOrderStatus.Delivered, order.Status);
        Assert.Equal(PaymentMethod.Kart, order.CollectedMethod);
        Assert.Equal(order.Total, order.CollectedAmount);
        Assert.False(order.IsSettled);

        order.Settle(StaffId, Now.AddMinutes(60));
        Assert.True(order.IsSettled);
        Assert.Equal(DeliveryOrderStatus.Delivered, order.Status);
        Assert.Throws<DomainException>(() => order.Settle(StaffId, Now.AddMinutes(61)));
    }

    [Fact]
    public void AdvanceFromKitchen_OnlyMovesForward()
    {
        DeliveryOrder order = Ready();

        Assert.False(order.AdvanceFromKitchen(OrderStatus.Preparing));
        Assert.False(order.AdvanceFromKitchen(OrderStatus.Ready));
        Assert.Equal(DeliveryOrderStatus.Ready, order.Status);
        Assert.False(Received().AdvanceFromKitchen(OrderStatus.Ready));
    }

    [Fact]
    public void Dispatch_NeedsReadyAndACourier()
    {
        DeliveryOrder accepted = Accepted();
        accepted.AssignCourier(Guid.NewGuid());
        Assert.Throws<DomainException>(() => accepted.Dispatch(Now));

        Assert.Throws<DomainException>(() => Ready().Dispatch(Now));
    }

    [Fact]
    public void Courier_CannotBeChangedOnceOnTheWay()
    {
        Assert.Throws<DomainException>(() => OnTheWay().AssignCourier(Guid.NewGuid()));
    }

    [Fact]
    public void Deliver_OnlyFromOnTheWay_AndOnlyCashOrCard()
    {
        Assert.Throws<DomainException>(() => Ready().Deliver(PaymentMethod.Nakit, Now));
        Assert.Throws<DomainException>(() => OnTheWay().Deliver(PaymentMethod.Iban, Now));
    }

    [Fact]
    public void Settle_RequiresDelivery()
    {
        Assert.Throws<DomainException>(() => OnTheWay().Settle(StaffId, Now));
    }

    [Fact]
    public void Reject_OnlyWhileReceived_WithReason()
    {
        DeliveryOrder order = Received();
        Assert.Throws<DomainException>(() => order.Reject("  ", StaffId, Now));

        order.Reject("Bölgeye kurye yok", StaffId, Now);

        Assert.Equal(DeliveryOrderStatus.Rejected, order.Status);
        Assert.Equal("Bölgeye kurye yok", order.RejectReason);
        Assert.Throws<DomainException>(() => Accepted().Reject("Geç", StaffId, Now));
    }

    [Fact]
    public void AutoReject_OnlyAfterTheBranchTimeout()
    {
        DeliveryOrder order = Received();

        Assert.Throws<DomainException>(() => order.AutoReject(order.CreatedAt.AddMinutes(9), 10));
        order.AutoReject(order.CreatedAt.AddMinutes(10), 10);

        Assert.Equal(DeliveryOrderStatus.Rejected, order.Status);
        Assert.Equal(DeliveryOrder.AutoRejectReason, order.RejectReason);
        Assert.Null(order.RejectedByUserId);
    }

    [Fact]
    public void Customer_CanCancelOnlyBeforeAcceptance()
    {
        DeliveryOrder order = Received();
        order.CancelByCustomer(Now);
        Assert.Equal(DeliveryOrderStatus.Cancelled, order.Status);

        Assert.Throws<DomainException>(() => Accepted().CancelByCustomer(Now));
    }

    [Fact]
    public void Staff_CanCancelFromAcceptedToOnTheWay_WithReason()
    {
        DeliveryOrder onTheWay = OnTheWay();
        onTheWay.CancelByStaff("Müşteriye ulaşılamadı", StaffId, Now);
        Assert.Equal(DeliveryOrderStatus.Cancelled, onTheWay.Status);

        Assert.Throws<DomainException>(() => Received().CancelByStaff("Neden", StaffId, Now));
        Assert.Throws<DomainException>(() => Accepted().CancelByStaff("", StaffId, Now));

        DeliveryOrder delivered = OnTheWay();
        delivered.Deliver(PaymentMethod.Nakit, Now);
        Assert.Throws<DomainException>(() => delivered.CancelByStaff("Neden", StaffId, Now));
    }

    [Fact]
    public void Accept_RequiresADeliveryOrderOfTheSameBranch()
    {
        DeliveryOrder order = Received();

        Assert.Throws<DomainException>(() => order.Accept(Order.Create(Guid.NewGuid(), BranchId), 40, StaffId, Now));
        Assert.Throws<DomainException>(() => order.Accept(Order.CreateDelivery(Guid.NewGuid(), 25m), 40, StaffId, Now));
        Assert.Equal(DeliveryOrderStatus.Received, order.Status);
    }

    [Fact]
    public void Lines_CannotChangeAfterAcceptance()
    {
        DeliveryOrder order = Accepted();
        Product product = Product.Create("Ayran", 30m, "", Guid.NewGuid());

        Assert.Throws<DomainException>(() => order.AddProductLine(product, 30m, 10m, 1, null));
    }
}
