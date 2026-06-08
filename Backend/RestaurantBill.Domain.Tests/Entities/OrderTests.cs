using System.Reflection;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

public class OrderTests
{
    // A small helper so each test doesn't repeat product construction.
    // Id is normally assigned by the database, so we set it via reflection
    // to simulate a persisted product without exposing a public setter.
    private static Product CreateProduct(int id = 1, decimal price = 10m)
    {
        Product product = Product.Create("Test Product", price, true, "img.png", categoryId: 1, restaurantId: 1);
        SetId(product, id);
        return product;
    }

    private static void SetId(BaseEntity entity, int id)
    {
        PropertyInfo idProperty = typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!;
        idProperty.SetValue(entity, id);
    }

    // --- Create ---------------------------------------------------------

    [Fact]
    public void Create_WithValidTableId_ReturnsActiveOrder()
    {
        // Act
        Order order = Order.Create(tableId: 5);

        // Assert
        Assert.Equal(5, order.TableId);
        Assert.Equal(OrderStatus.Active, order.Status);
        Assert.Empty(order.OrderItems);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_WithInvalidTableId_ThrowsDomainException(int invalidTableId)
    {
        // Act + Assert
        Assert.Throws<DomainException>(() => Order.Create(invalidTableId));
    }

    // --- AddItem --------------------------------------------------------

    [Fact]
    public void AddItem_WithZeroQuantity_ThrowsDomainException()
    {
        // Arrange
        Order order = Order.Create(1);
        Product product = CreateProduct();

        // Act + Assert
        Assert.Throws<DomainException>(() => order.AddItem(product, 0));
    }

    [Fact]
    public void AddItem_WithSingleProduct_AddsItemAndCalculatesTotal()
    {
        // Arrange
        Order order = Order.Create(1);
        Product product = CreateProduct(price: 25m);

        // Act
        order.AddItem(product, 2);

        // Assert
        Assert.Single(order.OrderItems);
        Assert.Equal(50m, order.TotalPrice);      // 25 * 2
        Assert.Equal(OrderStatus.Pending, order.Status);
    }

    [Fact]
    public void AddItem_SameProductTwice_MergesQuantityInsteadOfDuplicating()
    {
        // Arrange
        Order order = Order.Create(1);
        Product product = CreateProduct(price: 10m);

        // Act
        order.AddItem(product, 1);
        order.AddItem(product, 3);

        // Assert
        Assert.Single(order.OrderItems);          // not two separate lines
        Assert.Equal(40m, order.TotalPrice);      // 10 * (1 + 3)
    }

    // --- Status transitions --------------------------------------------

    [Fact]
    public void Cancel_SetsStatusToCancelled()
    {
        // Arrange
        Order order = Order.Create(1);

        // Act
        order.Cancel();

        // Assert
        Assert.Equal(OrderStatus.Cancelled, order.Status);
    }

    [Fact]
    public void UpdateStatus_ToPreparing_MovesPendingItemsToPreparing()
    {
        // Arrange
        Order order = Order.Create(1);
        order.AddItem(CreateProduct(), 1);        // item starts as Pending

        // Act
        order.UpdateStatus(OrderStatus.Preparing);

        // Assert
        Assert.Equal(OrderStatus.Preparing, order.Status);
        Assert.All(order.OrderItems, item => Assert.Equal(OrderItemStatus.Preparing, item.Status));
    }
}
