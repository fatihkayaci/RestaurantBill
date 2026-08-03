using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder;
using RestaurantBill.Application.Features.Orders.Commands.CancelOrder;
using RestaurantBill.Application.Features.Orders.Commands.CloseOrder;
using RestaurantBill.Application.Features.Orders.Commands.CreateOrder;
using RestaurantBill.Application.Features.Orders.Commands.RemoveProductFromOrder;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemQuantity;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemStatus;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Orders;

public class OrderCommandHandlerTests
{
    private static Table CreateTable(Guid? tableId = null)
    {
        var table = Table.Create("Masa 1", "", Guid.NewGuid());
        SetId(table, tableId ?? Guid.NewGuid());
        return table;
    }

    private static Order CreateOrder(Guid? tableId = null)
    {
        var order = Order.Create(tableId ?? Guid.NewGuid());
        SetId(order, Guid.NewGuid());
        return order;
    }

    private static Product CreateProduct(Guid? id = null, decimal price = 20m)
    {
        var product = Product.Create("Ürün", price, "img.png", Guid.NewGuid());
        SetId(product, id ?? Guid.NewGuid());
        return product;
    }

    private static void SetId(BaseEntity entity, Guid id)
    {
        var prop = typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!;
        prop.SetValue(entity, id);
    }

    public class CreateOrderHandlerTests
    {
        [Fact]
        public async Task Handle_WithAvailableTable_CreatesOrderAndOccupiesTable()
        {
            var uow = new FakeUnitOfWork();
            Table table = CreateTable();
            await uow.TableRepo.AddAsync(table);

            var handler = new CreateOrderCommandHandler(uow);
            var command = new CreateOrderCommand { TableId = table.Id };

            var result = await handler.Handle(command, CancellationToken.None);
            Assert.True(result.IsSuccess);
            Assert.Single(uow.OrderRepo.Added);
            Assert.Equal(TableStatus.Occupied, table.Status);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithNonExistingTable_ThrowsException()
        {
            var uow = new FakeUnitOfWork();
            var handler = new CreateOrderCommandHandler(uow);
            var result = await handler.Handle(new CreateOrderCommand { TableId = Guid.NewGuid() }, CancellationToken.None);
            Assert.False(result.IsSuccess);
        }
    }

    public class CancelOrderHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingOrder_CancelsOrderAndReleasesTable()
        {
            var uow = new FakeUnitOfWork();
            Guid tableId = Guid.NewGuid();
            Table table = OrderCommandHandlerTests.CreateTable(tableId);
            table.Occupy();
            Order order = OrderCommandHandlerTests.CreateOrder(tableId);
            await uow.TableRepo.AddAsync(table);
            await uow.OrderRepo.AddAsync(order);

            var handler = new CancelOrderCommandHandler(uow, new FakeTableNotificationService(), new FakeCashierNotificationService(), new FakeCurrentUserService());
            await handler.Handle(new CancelOrderCommand { OrderId = order.Id }, CancellationToken.None);

            Assert.Equal(OrderStatus.Cancelled, order.Status);
            Assert.Equal(TableStatus.Available, table.Status);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithNonExistingOrder_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            var handler = new CancelOrderCommandHandler(uow, new FakeTableNotificationService(), new FakeCashierNotificationService(), new FakeCurrentUserService());

            var result = await handler.Handle(new CancelOrderCommand { OrderId = Guid.NewGuid() }, CancellationToken.None);
            Assert.True(result.IsFailure);
        }
    }

    public class CloseOrderHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingOrder_ClosesOrderAndReleasesTable()
        {
            var uow = new FakeUnitOfWork();
            Guid tableId = Guid.NewGuid();
            Table table = CreateTable(tableId);
            table.Occupy();
            Order order = CreateOrder(tableId);
            await uow.TableRepo.AddAsync(table);
            await uow.OrderRepo.AddAsync(order);

            var handler = new CloseOrderCommandHandler(uow, new FakeTableNotificationService(), new FakeCashierNotificationService(), new FakeCurrentUserService());
            await handler.Handle(new DeleteCommand { OrderId = order.Id }, CancellationToken.None);

            Assert.Equal(OrderStatus.Paid, order.Status);
            Assert.Equal(TableStatus.Available, table.Status);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithNonExistingOrder_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            var handler = new CloseOrderCommandHandler(uow, new FakeTableNotificationService(), new FakeCashierNotificationService(), new FakeCurrentUserService());

            var result = await handler.Handle(new DeleteCommand { OrderId = Guid.NewGuid() }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class AddProductToOrderHandlerTests
    {
        [Fact]
        public async Task Handle_WithValidItems_AddsItemsToOrderAndSaves()
        {
            var uow = new FakeUnitOfWork();
            Order order = OrderCommandHandlerTests.CreateOrder();
            Product product = OrderCommandHandlerTests.CreateProduct(price: 15m);
            await uow.OrderRepo.AddAsync(order);
            await uow.ProductRepo.AddAsync(product);

            var handler = new AddProductToOrderCommandHandler(uow, new FakeTableNotificationService(), new FakeCashierNotificationService(), new FakeCurrentUserService());
            var command = new AddProductToOrderCommand
            {
                OrderId = order.Id,
                OrderItems = [new CreateOrderItemDto { ProductId = product.Id, Quantity = 2 }]
            };

            await handler.Handle(command, CancellationToken.None);

            Assert.Single(order.OrderItems);
            Assert.Equal(30m, order.TotalPrice);
            Assert.True(uow.SaveChangesCalled);
        }
    }

    public class RemoveProductFromOrderHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingProduct_RemovesItemAndSaves()
        {
            var uow = new FakeUnitOfWork();
            Order order = OrderCommandHandlerTests.CreateOrder();
            Product product = OrderCommandHandlerTests.CreateProduct();
            order.AddItem(product, 2);
            await uow.OrderRepo.AddAsync(order);

            var handler = new RemoveProductFromOrderCommandHandler(uow, new FakeTableNotificationService(), new FakeCurrentUserService());
            await handler.Handle(new RemoveProductFromOrderCommand { OrderId = order.Id, ProductId = product.Id }, CancellationToken.None);

            Assert.Empty(order.OrderItems);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithNonExistingOrder_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            var handler = new RemoveProductFromOrderCommandHandler(uow, new FakeTableNotificationService(), new FakeCurrentUserService());

            var result = await handler.Handle(new RemoveProductFromOrderCommand { OrderId = Guid.NewGuid(), ProductId = Guid.NewGuid() }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class UpdateOrderItemQuantityHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingItem_UpdatesQuantityAndSaves()
        {
            var uow = new FakeUnitOfWork();
            Order order = OrderCommandHandlerTests.CreateOrder();
            Product product = OrderCommandHandlerTests.CreateProduct(price: 10m);
            order.AddItem(product, 2);
            await uow.OrderRepo.AddAsync(order);

            var handler = new UpdateOrderItemQuantityCommandHandler(uow, new FakeTableNotificationService(), new FakeCurrentUserService());
            await handler.Handle(new UpdateOrderItemQuantityCommand { OrderId = order.Id, ProductId = product.Id, Quantity = 5 }, CancellationToken.None);

            Assert.Equal(50m, order.TotalPrice);
            Assert.True(uow.SaveChangesCalled);
        }
    }

    public class UpdateOrderStatusHandlerTests
    {
        [Fact]
        public async Task Handle_WithValidStatus_UpdatesStatusAndSaves()
        {
            var uow = new FakeUnitOfWork();
            Order order = OrderCommandHandlerTests.CreateOrder();
            order.AddItem(OrderCommandHandlerTests.CreateProduct(), 1);
            await uow.OrderRepo.AddAsync(order);

            var handler = new UpdateOrderStatusCommandHandler(uow, new FakeTableNotificationService(), new FakeCashierNotificationService(), new FakeCurrentUserService());
            await handler.Handle(new UpdateOrderStatusCommand { OrderId = order.Id, Status = (int)OrderStatus.Preparing }, CancellationToken.None);

            Assert.Equal(OrderStatus.Preparing, order.Status);
            Assert.True(uow.SaveChangesCalled);
        }
    }

    public class UpdateOrderItemStatusHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingItem_UpdatesStatusAndSaves()
        {
            var uow = new FakeUnitOfWork();
            Order order = OrderCommandHandlerTests.CreateOrder();
            order.AddItem(OrderCommandHandlerTests.CreateProduct(), 1);
            OrderItem item = order.OrderItems.First();
            Guid itemId = Guid.NewGuid();
            SetId(item, itemId);
            await uow.OrderRepo.AddAsync(order);

            var handler = new UpdateOrderItemStatusCommandHandler(uow, new FakeTableNotificationService(), new FakeCurrentUserService());
            await handler.Handle(new UpdateOrderItemStatusCommand { OrderId = order.Id, OrderItemId = itemId, Status = (int)OrderItemStatus.Preparing }, CancellationToken.None);

            Assert.Equal(OrderItemStatus.Preparing, item.Status);
            Assert.True(uow.SaveChangesCalled);
        }
    }
}
