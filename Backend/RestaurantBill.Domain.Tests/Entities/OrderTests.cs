using System.Reflection;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

public class OrderTests
{
    private static Product CreateProduct(Guid? id = null, decimal price = 10m)
    {
        Product product = Product.Create("Test Product", price, "img.png", Guid.NewGuid());
        SetId(product, id ?? Guid.NewGuid());
        SetCategory(product, Category.Create("Test Category", Guid.NewGuid(), taxRate: 0m));
        return product;
    }

    private static void SetId(BaseEntity entity, Guid id)
    {
        PropertyInfo idProperty = typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!;
        idProperty.SetValue(entity, id);
    }

    private static void SetCategory(Product product, Category category)
    {
        PropertyInfo categoryProperty = typeof(Product).GetProperty(nameof(Product.Category))!;
        categoryProperty.SetValue(product, category);
    }

    public class Create
    {
        [Fact]
        public void WithValidTableId_ReturnsActiveOrder()
        {
            Guid tableId = Guid.NewGuid();
            Order order = Order.Create(tableId);

            Assert.Equal(tableId, order.TableId);
            Assert.Equal(OrderStatus.Active, order.Status);
            Assert.Empty(order.OrderItems);
        }

        [Fact]
        public void WithInvalidTableId_ThrowsDomainException()
        {
            Assert.Throws<DomainException>(() => Order.Create(Guid.Empty));
        }
    }

    public class AddItem
    {
        [Fact]
        public void WithZeroQuantity_ThrowsDomainException()
        {
            Order order = Order.Create(Guid.NewGuid());
            Product product = OrderTests.CreateProduct();

            Assert.Throws<DomainException>(() => order.AddItem(product, 0));
        }

        [Fact]
        public void WithSingleProduct_AddsItemAndCalculatesTotal()
        {
            Order order = Order.Create(Guid.NewGuid());
            Product product = OrderTests.CreateProduct(price: 25m);

            order.AddItem(product, 2);

            Assert.Single(order.OrderItems);
            Assert.Equal(50m, order.TotalPrice);
            Assert.Equal(OrderStatus.Pending, order.Status);
        }

        [Fact]
        public void SameProductTwice_MergesQuantityInsteadOfDuplicating()
        {
            Order order = Order.Create(Guid.NewGuid());
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
            Order order = Order.Create(Guid.NewGuid());
            Product product = OrderTests.CreateProduct(price: 20m);
            order.AddItem(product, 3);

            order.RemoveItem(product.Id);

            Assert.Empty(order.OrderItems);
            Assert.Equal(0m, order.TotalPrice);
        }

        [Fact]
        public void WithNonExistingProduct_ThrowsDomainException()
        {
            Order order = Order.Create(Guid.NewGuid());

            Assert.Throws<DomainException>(() => order.RemoveItem(Guid.NewGuid()));
        }
    }

    public class UpdateItemQuantity
    {
        [Fact]
        public void WithExistingProduct_UpdatesQuantityAndRecalculatesTotal()
        {
            Order order = Order.Create(Guid.NewGuid());
            Product product = OrderTests.CreateProduct(price: 15m);
            order.AddItem(product, 2);

            order.UpdateItemQuantity(product.Id, quantity: 5);

            Assert.Equal(75m, order.TotalPrice);
        }

        [Fact]
        public void WithNonExistingProduct_ThrowsDomainException()
        {
            Order order = Order.Create(Guid.NewGuid());

            Assert.Throws<DomainException>(() => order.UpdateItemQuantity(Guid.NewGuid(), quantity: 1));
        }
    }

    public class UpdateStatus
    {
        [Fact]
        public void ToPreparing_MovesPendingItemsToPreparing()
        {
            Order order = Order.Create(Guid.NewGuid());
            order.AddItem(OrderTests.CreateProduct(), 1);

            order.UpdateStatus(OrderStatus.Preparing);

            Assert.Equal(OrderStatus.Preparing, order.Status);
            Assert.All(order.OrderItems, item => Assert.Equal(OrderItemStatus.Preparing, item.Status));
        }

        [Fact]
        public void ToReady_MovesPreparingItemsToReady()
        {
            Order order = Order.Create(Guid.NewGuid());
            order.AddItem(OrderTests.CreateProduct(), 1);
            order.UpdateStatus(OrderStatus.Preparing);

            order.UpdateStatus(OrderStatus.Ready);

            Assert.Equal(OrderStatus.Ready, order.Status);
            Assert.All(order.OrderItems, item => Assert.Equal(OrderItemStatus.Ready, item.Status));
        }

        [Fact]
        public void ToReady_MovesPendingItemsDirectlyToReady()
        {
            Order order = Order.Create(Guid.NewGuid());
            order.AddItem(OrderTests.CreateProduct(), 1);

            order.UpdateStatus(OrderStatus.Ready);

            Assert.Equal(OrderStatus.Ready, order.Status);
            Assert.All(order.OrderItems, item => Assert.Equal(OrderItemStatus.Ready, item.Status));
        }

        [Fact]
        public void ToServed_MovesReadyItemsToServed()
        {
            Order order = Order.Create(Guid.NewGuid());
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
            Order order = Order.Create(Guid.NewGuid());

            Assert.Throws<DomainException>(() => order.UpdateStatus((OrderStatus)999));
        }
    }

    public class UpdateItemStatus
    {
        [Fact]
        public void WithExistingItem_UpdatesStatus()
        {
            Order order = Order.Create(Guid.NewGuid());
            order.AddItem(OrderTests.CreateProduct(), 1);
            OrderItem item = order.OrderItems.First();
            Guid itemId = Guid.NewGuid();
            OrderTests.SetId(item, itemId);

            order.UpdateItemStatus(itemId, OrderItemStatus.Preparing);

            Assert.Equal(OrderItemStatus.Preparing, item.Status);
        }

        [Fact]
        public void WithNonExistingItem_ThrowsDomainException()
        {
            Order order = Order.Create(Guid.NewGuid());

            Assert.Throws<DomainException>(() =>
                order.UpdateItemStatus(Guid.NewGuid(), OrderItemStatus.Preparing));
        }

        [Fact]
        public void WithInvalidStatus_ThrowsDomainException()
        {
            Order order = Order.Create(Guid.NewGuid());

            Assert.Throws<DomainException>(() =>
                order.UpdateItemStatus(Guid.NewGuid(), (OrderItemStatus)999));
        }
    }

    public class Cancel
    {
        [Fact]
        public void SetsStatusToCancelled()
        {
            Order order = Order.Create(Guid.NewGuid());

            order.Cancel();

            Assert.Equal(OrderStatus.Cancelled, order.Status);
        }
    }

    public class Close
    {
        [Fact]
        public void SetsStatusToPaid()
        {
            Order order = Order.Create(Guid.NewGuid());

            order.Close();

            Assert.Equal(OrderStatus.Paid, order.Status);
        }
    }
}
