using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

// Ürün bazlı (adetli) iptal: 3 ayrandan 1'i ya da satırın tamamı; menüde menü adedi.
public class OrderCancelItemTests
{
    private static void SetId(BaseEntity entity, Guid id) =>
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private static Product CreateProduct(string name, decimal price)
    {
        Product product = Product.Create(name, price, "", Guid.NewGuid());
        SetId(product, Guid.NewGuid());
        return product;
    }

    // Veritabanına yazılmadan kalemlerin Id'si yoktur; Id ile çalışan metotlar için testte verilir.
    private static void AssignItemIds(Order order)
    {
        foreach (OrderItem item in order.OrderItems.Where(i => i.Id == Guid.Empty))
            SetId(item, Guid.NewGuid());
    }

    private static Order OrderWith(params (Product Product, int Quantity)[] lines)
    {
        Order order = Order.Create(Guid.NewGuid(), Guid.NewGuid());
        foreach (var (product, quantity) in lines)
            order.AddItem(product, quantity, 10m);
        AssignItemIds(order);
        return order;
    }

    private static OrderItem LineOf(Order order, Product product) => order.OrderItems.Single(i => i.ProductId == product.Id);

    private readonly Product _ayran = CreateProduct("Ayran", 30m);
    private readonly Product _kebap = CreateProduct("Adana Kebap", 100m);

    [Fact]
    public void CancelOrderItem_PartialQuantity_ReducesLineAndTotal()
    {
        Order order = OrderWith((_ayran, 3), (_kebap, 1));

        order.CancelOrderItem(LineOf(order, _ayran).Id, 1);

        Assert.Equal(2, LineOf(order, _ayran).Quantity);
        Assert.Equal(2 * 30m + 100m, order.TotalPrice);
    }

    [Fact]
    public void CancelOrderItem_AllQuantity_RemovesLine()
    {
        Order order = OrderWith((_ayran, 3), (_kebap, 1));

        order.CancelOrderItem(LineOf(order, _ayran).Id, 3);

        Assert.DoesNotContain(order.OrderItems, i => i.ProductId == _ayran.Id);
        Assert.Equal(100m, order.TotalPrice);
    }

    [Fact]
    public void CancelOrderItem_ItemAlreadyInKitchen_CanBeCancelled()
    {
        Order order = OrderWith((_ayran, 3));
        order.UpdateStatus(OrderStatus.Preparing);

        order.CancelOrderItem(LineOf(order, _ayran).Id, 2);

        OrderItem line = LineOf(order, _ayran);
        Assert.Equal(1, line.Quantity);
        Assert.Equal(OrderItemStatus.Preparing, line.Status);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(4)]
    public void CancelOrderItem_InvalidQuantity_Throws(int quantity)
    {
        Order order = OrderWith((_ayran, 3));

        Assert.Throws<DomainException>(() => order.CancelOrderItem(LineOf(order, _ayran).Id, quantity));
        Assert.Equal(3, LineOf(order, _ayran).Quantity);
        Assert.Equal(90m, order.TotalPrice);
    }

    [Fact]
    public void CancelOrderItem_UnknownLine_Throws()
    {
        Order order = OrderWith((_ayran, 3));

        Assert.Throws<DomainException>(() => order.CancelOrderItem(Guid.NewGuid(), 1));
    }

    [Theory]
    [InlineData(OrderStatus.Paid)]
    [InlineData(OrderStatus.Cancelled)]
    public void CancelOrderItem_ClosedOrder_Throws(OrderStatus closedStatus)
    {
        Order order = OrderWith((_ayran, 3));
        Guid lineId = LineOf(order, _ayran).Id;
        if (closedStatus == OrderStatus.Paid) order.Close(); else order.Cancel();

        DomainException ex = Assert.Throws<DomainException>(() => order.CancelOrderItem(lineId, 1));
        Assert.Contains("Kapanmış", ex.Message);
        Assert.Equal(3, LineOf(order, _ayran).Quantity);
    }

    [Fact]
    public void CancelOrderItem_PaidUnitsAreGone_OnlyUnpaidQuantityCanBeCancelled()
    {
        Order order = OrderWith((_ayran, 3));
        Guid lineId = LineOf(order, _ayran).Id;
        // 3 ayrandan 2'si ödendi: satırda ödenmemiş 1 adet kalır.
        order.SettleItem(lineId, 2);

        DomainException ex = Assert.Throws<DomainException>(() => order.CancelOrderItem(lineId, 2));
        Assert.Contains("ödenmemiş", ex.Message);

        order.CancelOrderItem(lineId, 1);
        Assert.Empty(order.OrderItems);
        Assert.Equal(0m, order.TotalPrice);
    }

    [Fact]
    public void CancelOrderItem_BelowPaidOnAccount_Throws()
    {
        Order order = OrderWith((_ayran, 3), (_kebap, 1));
        // Hesap 190 ₺; 150 ₺ "Tutar gir" ile alındı. Kebap iptal edilirse hesap 90 ₺'ye, alınan paranın altına iner.
        order.PayOnAccount(150m);

        Assert.Throws<DomainException>(() => order.CancelOrderItem(LineOf(order, _kebap).Id, 1));
        Assert.Equal(190m, order.TotalPrice);

        // Bir ayran iptali hesabı 160 ₺'ye indirir: alınan 150 ₺'nin üstünde kalır.
        order.CancelOrderItem(LineOf(order, _ayran).Id, 1);
        Assert.Equal(160m, order.TotalPrice);
    }

    private static (Order Order, OrderItem Line) OrderWithSetMenu(int quantity)
    {
        Product adana = CreateProduct("Adana Kebap", 100m);
        Product ayran = CreateProduct("Ayran", 30m);
        SetMenu menu = SetMenu.Create(Guid.NewGuid(), "Adana Menü");
        SetId(menu, Guid.NewGuid());
        menu.SetContents([
            new SetMenuSlotDraft("Ana yemek", [new SetMenuOptionDraft(adana, false)]),
            new SetMenuSlotDraft("İçecek", [new SetMenuOptionDraft(ayran, true)]),
        ], DiscountType.None, 0m);
        foreach (SetMenuSlot slot in menu.Slots)
            SetId(slot, Guid.NewGuid());

        Order order = Order.Create(Guid.NewGuid(), Guid.NewGuid());
        order.AddSetMenu(menu, new Dictionary<Guid, Guid>(), quantity, taxRate: 10m);
        AssignItemIds(order);
        return (order, order.OrderItems.Single(i => i.IsSetMenu));
    }

    [Fact]
    public void CancelOrderItem_SetMenuPartial_ReducesMenuAndComponents_EvenInKitchen()
    {
        var (order, line) = OrderWithSetMenu(3);
        order.UpdateStatus(OrderStatus.Preparing);

        order.CancelOrderItem(line.Id, 1);

        Assert.Equal(2, line.Quantity);
        Assert.All(order.GetSetMenuComponents(line), c => Assert.Equal(2, c.Quantity));
        Assert.Equal(2 * 130m, order.TotalPrice);
    }

    [Fact]
    public void CancelOrderItem_SetMenuAll_RemovesMenuWithComponents()
    {
        var (order, line) = OrderWithSetMenu(2);

        order.CancelOrderItem(line.Id, 2);

        Assert.Empty(order.OrderItems);
        Assert.Equal(0m, order.TotalPrice);
    }

    [Fact]
    public void CancelOrderItem_SetMenuComponent_Throws()
    {
        var (order, line) = OrderWithSetMenu(2);
        OrderItem component = order.GetSetMenuComponents(line).First();

        Assert.Throws<DomainException>(() => order.CancelOrderItem(component.Id, 1));
        Assert.Equal(2, line.Quantity);
    }
}
