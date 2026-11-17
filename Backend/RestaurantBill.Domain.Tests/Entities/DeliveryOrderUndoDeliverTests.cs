using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

// Kuryenin yanlış "Teslim ettim"i: teslimden sonraki 2 dakika içinde ve kasaya teslim edilmeden geri alınır.
public class DeliveryOrderUndoDeliverTests
{
    private static readonly Guid BranchId = Guid.NewGuid();
    private static readonly DateTime Now = new(2026, 11, 16, 12, 0, 0, DateTimeKind.Utc);

    private static void SetId(BaseEntity entity, Guid id) =>
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private static DeliveryOrder OnTheWay()
    {
        DeliveryZone zone = DeliveryZone.Create(BranchId, "Moda", 25m, 150m, 40, 0);
        SetId(zone, Guid.NewGuid());
        DeliveryOrder order = DeliveryOrder.Create(BranchId, 7, Guid.NewGuid(), "Ayşe Yılmaz", "0532 123 45 67",
            "Moda Cd. 1", null, null, zone, PaymentMethod.Nakit, null);
        Product product = Product.Create("Lahmacun", 90m, "", Guid.NewGuid());
        SetId(product, Guid.NewGuid());
        order.AddProductLine(product, 80m, 10m, 2, null);
        order.Accept(Order.CreateDelivery(BranchId, order.DeliveryFee), 40, Guid.NewGuid(), Now.AddMinutes(-30));
        order.AdvanceFromKitchen(OrderStatus.Ready);
        order.AssignCourier(Guid.NewGuid());
        order.Dispatch(Now.AddMinutes(-10));
        return order;
    }

    private static DeliveryOrder Delivered(PaymentMethod method = PaymentMethod.Nakit)
    {
        DeliveryOrder order = OnTheWay();
        order.Deliver(method, Now);
        return order;
    }

    [Fact]
    public void UndoDeliver_WithinWindow_ReturnsToOnTheWay_AndClearsCollection()
    {
        DeliveryOrder order = Delivered(PaymentMethod.Kart);
        DateTime? dispatchedAt = order.DispatchedAt;

        order.UndoDeliver(Now.AddMinutes(DeliveryOrder.UndoDeliverWindowMinutes));

        Assert.Equal(DeliveryOrderStatus.OnTheWay, order.Status);
        Assert.Null(order.DeliveredAt);
        Assert.Null(order.CollectedMethod);
        Assert.Null(order.CollectedAmount);
        Assert.Null(order.CollectedAt);
        Assert.Equal(dispatchedAt, order.DispatchedAt);
        Assert.Null(order.UndoDeliverDeadline());

        // Geri alınan sipariş yeniden teslim edilebilir.
        order.Deliver(PaymentMethod.Nakit, Now.AddMinutes(3));
        Assert.Equal(PaymentMethod.Nakit, order.CollectedMethod);
    }

    [Fact]
    public void UndoDeliver_AfterWindow_Throws()
    {
        DeliveryOrder order = Delivered();

        Assert.Throws<DomainException>(() => order.UndoDeliver(Now.AddMinutes(DeliveryOrder.UndoDeliverWindowMinutes).AddSeconds(1)));
        Assert.Equal(DeliveryOrderStatus.Delivered, order.Status);
    }

    [Fact]
    public void UndoDeliver_AfterHandover_Throws()
    {
        DeliveryOrder order = Delivered();
        order.Settle(Guid.NewGuid(), Now.AddSeconds(30));

        Assert.Null(order.UndoDeliverDeadline());
        Assert.Throws<DomainException>(() => order.UndoDeliver(Now.AddSeconds(40)));
        Assert.NotNull(order.CollectedAt);
    }

    [Fact]
    public void UndoDeliver_NotDelivered_Throws()
    {
        Assert.Throws<DomainException>(() => OnTheWay().UndoDeliver(Now));
    }

    [Fact]
    public void UndoDeliverDeadline_IsDeliveredAtPlusWindow()
    {
        Assert.Equal(Now.AddMinutes(DeliveryOrder.UndoDeliverWindowMinutes), Delivered().UndoDeliverDeadline());
        Assert.Null(OnTheWay().UndoDeliverDeadline());
    }
}
