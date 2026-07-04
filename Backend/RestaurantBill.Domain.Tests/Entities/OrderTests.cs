using System.Reflection;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

public class OrderTests
{
    private static Product CreateProduct(int id = 1, decimal price = 10m)
    {
        Product product = Product.Create("Test Product", price, true, "img.png", categoryId: 1);
        SetId(product, id);
        return product;
    }

    private static void SetId(BaseEntity entity, int id)
    {
        PropertyInfo idProperty = typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!;
        idProperty.SetValue(entity, id);
    }

    public class Create
    {
        [Fact]
        public void WithValidTableId_ReturnsActiveOrder()
        {
            Order order = Order.Create(tableId: 5);

            Assert.Equal(5, order.TableId);
            Assert.Equal(OrderStatus.Active, order.Status);
            Assert.Empty(order.OrderItems);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void WithInvalidTableId_ThrowsDomainException(int invalidTableId)
        {
            Assert.Throws<DomainException>(() => Order.Create(invalidTableId));
        }
    }

    public class AddItem
    {
        [Fact]
        public void WithZeroQuantity_ThrowsDomainException()
        {
            Order order = Order.Create(1);
            Product product = OrderTests.CreateProduct();

            Assert.Throws<DomainException>(() => order.AddItem(product, 0));
        }

        [Fact]
        public void WithSingleProduct_AddsItemAndCalculatesTotal()
        {
            Order order = Order.Create(1);
            Product product = OrderTests.CreateProduct(price: 25m);

            order.AddItem(product, 2);

            Assert.Single(order.OrderItems);
            Assert.Equal(50m, order.TotalPrice);
            Assert.Equal(OrderStatus.Pending, order.Status);
        }

        [Fact]
        public void SameProductTwice_MergesQuantityInsteadOfDuplicating()
        {
            Order order = Order.Create(1);
            Product product = OrderTests.CreateProduct(price: 10m);

            order.AddItem(product, 1);
            order.AddItem(product, 3);

            Assert.Single(order.OrderItems);
            Assert.Equal(40m, order.TotalPrice);
        }
    }

    public class RemoveItem
    {
        [Fact]
        public void WithExistingProduct_RemovesItemAndRecalculatesTotal()
        {
            Order order = Order.Create(1);
            Product product = OrderTests.CreateProduct(id: 1, price: 20m);
            order.AddItem(product, 3);

            order.RemoveItem(productId: 1);

            Assert.Empty(order.OrderItems);
            Assert.Equal(0m, order.TotalPrice);
        }

        [Fact]
        public void WithNonExistingProduct_ThrowsDomainException()
        {
            Order order = Order.Create(1);

            Assert.Throws<DomainException>(() => order.RemoveItem(productId: 99));
        }
    }

    public class UpdateItemQuantity
    {
        [Fact]
        public void WithExistingProduct_UpdatesQuantityAndRecalculatesTotal()
        {
            Order order = Order.Create(1);
            Product product = OrderTests.CreateProduct(id: 1, price: 15m);
            order.AddItem(product, 2);

            order.UpdateItemQuantity(productId: 1, quantity: 5);

            Assert.Equal(75m, order.TotalPrice);
        }

        [Fact]
        public void WithNonExistingProduct_ThrowsDomainException()
        {
            Order order = Order.Create(1);

            Assert.Throws<DomainException>(() => order.UpdateItemQuantity(productId: 99, quantity: 1));
        }
    }

    public class UpdateStatus
    {
        [Fact]
        public void ToPreparing_MovesPendingItemsToPreparing()
        {
            Order order = Order.Create(1);
            order.AddItem(OrderTests.CreateProduct(), 1);

            order.UpdateStatus(OrderStatus.Preparing);

            Assert.Equal(OrderStatus.Preparing, order.Status);
            Assert.All(order.OrderItems, item => Assert.Equal(OrderItemStatus.Preparing, item.Status));
        }

        [Fact]
        public void ToReady_MovesPreparingItemsToReady()
        {
            Order order = Order.Create(1);
            order.AddItem(OrderTests.CreateProduct(), 1);
            order.UpdateStatus(OrderStatus.Preparing);

            order.UpdateStatus(OrderStatus.Ready);

            Assert.Equal(OrderStatus.Ready, order.Status);
            Assert.All(order.OrderItems, item => Assert.Equal(OrderItemStatus.Ready, item.Status));
        }

        [Fact]
        public void ToServed_MovesReadyItemsToServed()
        {
            Order order = Order.Create(1);
            order.AddItem(OrderTests.CreateProduct(), 1);
            order.UpdateStatus(OrderStatus.Preparing);
            order.UpdateStatus(OrderStatus.Ready);

            order.UpdateStatus(OrderStatus.Served);

            Assert.Equal(OrderStatus.Served, order.Status);
            Assert.All(order.OrderItems, item => Assert.Equal(OrderItemStatus.Served, item.Status));
        }

        [Fact]
        public void WithInvalidStatus_ThrowsDomainException()
        {
            Order order = Order.Create(1);

            Assert.Throws<DomainException>(() => order.UpdateStatus((OrderStatus)999));
        }
    }

    public class UpdateItemStatus
    {
        [Fact]
        public void WithExistingItem_UpdatesStatus()
        {
            Order order = Order.Create(1);
            order.AddItem(OrderTests.CreateProduct(), 1);
            OrderItem item = order.OrderItems.First();
            OrderTests.SetId(item, 7);

            order.UpdateItemStatus(orderItemId: 7, OrderItemStatus.Preparing);

            Assert.Equal(OrderItemStatus.Preparing, item.Status);
        }

        [Fact]
        public void WithNonExistingItem_ThrowsDomainException()
        {
            Order order = Order.Create(1);

            Assert.Throws<DomainException>(() =>
                order.UpdateItemStatus(orderItemId: 99, OrderItemStatus.Preparing));
        }

        [Fact]
        public void WithInvalidStatus_ThrowsDomainException()
        {
            Order order = Order.Create(1);

            Assert.Throws<DomainException>(() =>
                order.UpdateItemStatus(orderItemId: 1, (OrderItemStatus)999));
        }
    }

    public class Cancel
    {
        [Fact]
        public void SetsStatusToCancelled()
        {
            Order order = Order.Create(1);

            order.Cancel();

            Assert.Equal(OrderStatus.Cancelled, order.Status);
        }
    }

    public class Close
    {
        [Fact]
        public void SetsStatusToPaid()
        {
            Order order = Order.Create(1);

            order.Close();

            Assert.Equal(OrderStatus.Paid, order.Status);
        }
    }
}
