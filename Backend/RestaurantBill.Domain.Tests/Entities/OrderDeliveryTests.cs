using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

// Order fabrikaları, teslimat ücreti kuralları, anlık fiyatla ekleme ve masaya özgü işlemlerin paket siparişte reddi.
public class OrderDeliveryTests
{
    private static readonly Guid BranchId = Guid.NewGuid();

    private static Product CreateProduct(decimal price = 100m)
    {
        Product product = Product.Create("Pide", price, "", Guid.NewGuid());
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(product, Guid.NewGuid());
        return product;
    }

    [Fact]
    public void Create_IsDineInWithTableAndBranch()
    {
        Guid tableId = Guid.NewGuid();
        Order order = Order.Create(tableId, BranchId);

        Assert.Equal(OrderType.DineIn, order.OrderType);
        Assert.Equal(tableId, order.TableId);
        Assert.Equal(BranchId, order.BranchId);
        Assert.True(order.HasTable);
        Assert.Throws<DomainException>(() => Order.Create(tableId, Guid.Empty));
    }

    [Fact]
    public void CreateDelivery_HasNoTable_AndCountsTheFeeInTheTotal()
    {
        Order order = Order.CreateDelivery(BranchId, 30m, " kapıda zil çalmayın ");

        Assert.Equal(OrderType.Delivery, order.OrderType);
        Assert.Null(order.TableId);
        Assert.False(order.HasTable);
        Assert.Equal("kapıda zil çalmayın", order.Note);
        Assert.Equal(30m, order.TotalPrice);

        order.AddItemAtPrice(CreateProduct(), 80m, 2, 10m);
        Assert.Equal(190m, order.TotalPrice);
        Assert.Throws<DomainException>(() => Order.CreateDelivery(BranchId, -1m));
        Assert.Throws<DomainException>(() => Order.CreateDelivery(Guid.Empty, 0m));
    }

    [Fact]
    public void SettleDeliveryFee_RemovesTheFeeFromTheTotal_Once()
    {
        Order order = Order.CreateDelivery(BranchId, 30m);
        order.AddItemAtPrice(CreateProduct(), 80m, 1, 10m);

        order.SettleDeliveryFee();

        Assert.True(order.DeliveryFeeSettled);
        Assert.Equal(80m, order.TotalPrice);
        Assert.Throws<DomainException>(order.SettleDeliveryFee);
        Assert.Throws<DomainException>(() => Order.CreateDelivery(BranchId, 0m).SettleDeliveryFee());
        Assert.Throws<DomainException>(() => Order.Create(Guid.NewGuid(), BranchId).SettleDeliveryFee());
    }

    [Fact]
    public void Close_NeedsTheDeliveryFeeSettled()
    {
        Order order = Order.CreateDelivery(BranchId, 30m);
        Assert.Throws<DomainException>(order.Close);

        order.SettleDeliveryFee();
        order.Close();
        Assert.Equal(OrderStatus.Paid, order.Status);

        Order free = Order.CreateDelivery(BranchId, 0m);
        free.Close();
        Assert.Equal(OrderStatus.Paid, free.Status);
    }

    [Fact]
    public void AddItemAtPrice_UsesTheSnapshotPrice_AndDoesNotMergeWithADifferentPrice()
    {
        Product product = CreateProduct(price: 100m);
        Order order = Order.Create(Guid.NewGuid(), BranchId);

        order.AddItemAtPrice(product, 90m, 1, 10m);
        order.AddItemAtPrice(product, 90m, 2, 10m);
        order.AddItem(product, 1, 10m);

        Assert.Equal(2, order.OrderItems.Count);
        Assert.Contains(order.OrderItems, i => i.UnitPrice == 90m && i.Quantity == 3);
        Assert.Contains(order.OrderItems, i => i.UnitPrice == 100m && i.Quantity == 1);
        Assert.Equal(370m, order.TotalPrice);
        Assert.Equal(OrderStatus.Pending, order.Status);
    }

    [Fact]
    public void AddSetMenuAtPrice_UsesTheSnapshotPrice()
    {
        Product adana = CreateProduct();
        SetMenu menu = SetMenu.Create(Guid.NewGuid(), "Adana Menü");
        menu.SetContents([new SetMenuSlotDraft("Ana yemek", [new SetMenuOptionDraft(adana, false)])], DiscountType.None, 0m);
        Order order = Order.CreateDelivery(BranchId, 0m);

        OrderItem line = order.AddSetMenuAtPrice(menu, new Dictionary<Guid, Guid>(), 140m, 2, 10m);

        Assert.Equal(140m, line.UnitPrice);
        Assert.Equal(280m, order.TotalPrice);
        Assert.Single(order.GetSetMenuComponents(line));
    }

    [Fact]
    public void TableOnlyOperations_RejectADeliveryOrder()
    {
        Order delivery = Order.CreateDelivery(BranchId, 0m);
        Order dineIn = Order.Create(Guid.NewGuid(), BranchId);

        Assert.Equal(Order.TableOnlyMessage, Assert.Throws<DomainException>(() => delivery.RequestBill(DateTime.UtcNow)).Message);
        Assert.Equal(Order.TableOnlyMessage, Assert.Throws<DomainException>(() => delivery.MoveToTable(Guid.NewGuid())).Message);
        Assert.Equal(Order.TableOnlyMessage, Assert.Throws<DomainException>(() => dineIn.MergeFrom(delivery)).Message);
        Assert.Equal(Order.TableOnlyMessage, Assert.Throws<DomainException>(() => delivery.MergeFrom(dineIn)).Message);
    }
}
