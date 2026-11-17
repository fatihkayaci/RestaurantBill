using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

// Kurye kasası sayımı (teslim alımda sayılan nakit ve fark) ve engelli numaranın geri çevrilen denemeleri.
public class CourierCashCountTests
{
    private static readonly Guid BranchId = Guid.NewGuid();
    private static readonly DateTime Now = new(2026, 11, 16, 12, 0, 0, DateTimeKind.Utc);

    private static void SetId(BaseEntity entity, Guid id) =>
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private static DeliveryOrder Delivered()
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
        order.Deliver(PaymentMethod.Nakit, Now);
        return order;
    }

    [Theory]
    [InlineData(185, 185, 0)]
    [InlineData(185, 180, -5)]
    [InlineData(185, 190.5, 5.5)]
    public void CashCountDifference_IsCountedMinusExpected(decimal expected, decimal counted, decimal difference)
        => Assert.Equal(difference, DeliveryOrder.CashCountDifference(expected, counted));

    [Fact]
    public void RecordHandoverCashCount_OnSettledOrder_StoresCountAndDifference()
    {
        DeliveryOrder order = Delivered();
        order.Settle(Guid.NewGuid(), Now.AddMinutes(5));

        order.RecordHandoverCashCount(185m, 175.004m);

        Assert.Equal(175m, order.HandoverCountedCash);
        Assert.Equal(-10m, order.HandoverCashDifference);
    }

    [Fact]
    public void RecordHandoverCashCount_BeforeSettle_Throws()
    {
        DeliveryOrder order = Delivered();

        Assert.Throws<DomainException>(() => order.RecordHandoverCashCount(185m, 185m));
        Assert.Null(order.HandoverCountedCash);
        Assert.Null(order.HandoverCashDifference);
    }

    [Fact]
    public void RecordHandoverCashCount_Negative_Throws()
    {
        DeliveryOrder order = Delivered();
        order.Settle(Guid.NewGuid(), Now.AddMinutes(5));

        Assert.Throws<DomainException>(() => order.RecordHandoverCashCount(185m, -1m));
    }

    [Fact]
    public void BlockedPhone_RegisterBlockedAttempt_CountsAndStampsLastAttempt()
    {
        Guid source = Guid.NewGuid();
        BlockedPhone blocked = BlockedPhone.Create(BranchId, "0532 123 45 67", "Sahte", Guid.NewGuid(), source);
        Assert.Equal(0, blocked.BlockedAttemptCount);
        Assert.Null(blocked.LastBlockedAttemptAt);
        Assert.Equal(source, blocked.SourceDeliveryOrderId);

        blocked.RegisterBlockedAttempt(Now);
        blocked.RegisterBlockedAttempt(Now.AddMinutes(3));

        Assert.Equal(2, blocked.BlockedAttemptCount);
        Assert.Equal(Now.AddMinutes(3), blocked.LastBlockedAttemptAt);
    }

    [Fact]
    public void BlockedPhone_CreatedByHand_HasNoSourceOrder()
        => Assert.Null(BlockedPhone.Create(BranchId, "0532 123 45 67", null, Guid.NewGuid()).SourceDeliveryOrderId);
}
