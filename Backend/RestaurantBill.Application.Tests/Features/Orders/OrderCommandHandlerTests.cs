using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder;
using RestaurantBill.Application.Features.Orders.Commands.CancelOrder;
using RestaurantBill.Application.Features.Orders.Commands.CloseOrder;
using RestaurantBill.Application.Features.Orders.Commands.CreateOrder;
using RestaurantBill.Application.Features.Orders.Commands.RemoveProductFromOrder;
using RestaurantBill.Application.Features.Orders.Commands.TransferOrder;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemQuantity;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemStatus;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus;
using RestaurantBill.Application.Features.Orders.Queries;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
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

    public class CreateOrderHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithAvailableTable_CreatesOrderAndOccupiesTable()
        {
            Table table = CreateTable();
            DbContext.Tables.Add(table);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new CreateOrderCommandHandler(Db, CurrentUser);
            var command = new CreateOrderCommand { TableId = table.Id };

            var result = await handler.Handle(command, CancellationToken.None);
            Assert.True(result.IsSuccess);
            Assert.Single(DbContext.Orders.ToList());
            Assert.Equal(TableStatus.Occupied, table.Status);
        }

        [Fact]
        public async Task Handle_WithNonExistingTable_ThrowsException()
        {
            var handler = new CreateOrderCommandHandler(Db, CurrentUser);
            var result = await handler.Handle(new CreateOrderCommand { TableId = Guid.NewGuid() }, CancellationToken.None);
            Assert.False(result.IsSuccess);
        }
    }

    public class CancelOrderHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingOrder_CancelsOrderAndReleasesTable()
        {
            Guid tableId = Guid.NewGuid();
            Table table = OrderCommandHandlerTests.CreateTable(tableId);
            table.Occupy();
            Order order = OrderCommandHandlerTests.CreateOrder(tableId);
            DbContext.Tables.Add(table);
            DbContext.Orders.Add(order);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new CancelOrderCommandHandler(Db, new FakeTableNotificationService(), new FakeCashierNotificationService(), CurrentUser);
            await handler.Handle(new CancelOrderCommand { OrderId = order.Id }, CancellationToken.None);

            Assert.Equal(OrderStatus.Cancelled, order.Status);
            Assert.Equal(TableStatus.Available, table.Status);
        }

        [Fact]
        public async Task Handle_WithNonExistingOrder_ReturnsFailureResult()
        {
            var handler = new CancelOrderCommandHandler(Db, new FakeTableNotificationService(), new FakeCashierNotificationService(), CurrentUser);

            var result = await handler.Handle(new CancelOrderCommand { OrderId = Guid.NewGuid() }, CancellationToken.None);
            Assert.True(result.IsFailure);
        }
    }

    public class CloseOrderHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingOrder_ClosesOrderAndReleasesTable()
        {
            Guid tableId = Guid.NewGuid();
            Table table = CreateTable(tableId);
            table.Occupy();
            Order order = CreateOrder(tableId);
            DbContext.Tables.Add(table);
            DbContext.Orders.Add(order);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new CloseOrderCommandHandler(Db, new FakeTableNotificationService(), new FakeCashierNotificationService(), CurrentUser);
            await handler.Handle(new DeleteCommand { OrderId = order.Id }, CancellationToken.None);

            Assert.Equal(OrderStatus.Paid, order.Status);
            Assert.Equal(TableStatus.Available, table.Status);
        }

        [Fact]
        public async Task Handle_WithNonExistingOrder_ReturnsFailureResult()
        {
            var handler = new CloseOrderCommandHandler(Db, new FakeTableNotificationService(), new FakeCashierNotificationService(), CurrentUser);

            var result = await handler.Handle(new DeleteCommand { OrderId = Guid.NewGuid() }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class AddProductToOrderHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithValidItems_AddsItemsToOrderAndSaves()
        {
            Order order = OrderCommandHandlerTests.CreateOrder();
            Product product = OrderCommandHandlerTests.CreateProduct(price: 15m);
            DbContext.Orders.Add(order);
            DbContext.Products.Add(product);
            await DbContext.SaveChangesAsync();

            var handler = new AddProductToOrderCommandHandler(Db, new FakeTableNotificationService(), new FakeCashierNotificationService(), CurrentUser);
            var command = new AddProductToOrderCommand
            {
                OrderId = order.Id,
                OrderItems = [new CreateOrderItemDto { ProductId = product.Id, Quantity = 2 }]
            };

            await handler.Handle(command, CancellationToken.None);

            Assert.Single(order.OrderItems);
            Assert.Equal(30m, order.TotalPrice);
        }
    }

    public class RemoveProductFromOrderHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingProduct_RemovesItemAndSaves()
        {
            Order order = OrderCommandHandlerTests.CreateOrder();
            Product product = OrderCommandHandlerTests.CreateProduct();
            order.AddItem(product, 2);
            DbContext.Orders.Add(order);
            await DbContext.SaveChangesAsync();

            var handler = new RemoveProductFromOrderCommandHandler(Db, new FakeTableNotificationService(), CurrentUser);
            await handler.Handle(new RemoveProductFromOrderCommand { OrderId = order.Id, ProductId = product.Id }, CancellationToken.None);

            Assert.Empty(order.OrderItems);
        }

        [Fact]
        public async Task Handle_WithNonExistingOrder_ReturnsFailureResult()
        {
            var handler = new RemoveProductFromOrderCommandHandler(Db, new FakeTableNotificationService(), CurrentUser);

            var result = await handler.Handle(new RemoveProductFromOrderCommand { OrderId = Guid.NewGuid(), ProductId = Guid.NewGuid() }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class UpdateOrderItemQuantityHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingItem_UpdatesQuantityAndSaves()
        {
            Order order = OrderCommandHandlerTests.CreateOrder();
            Product product = OrderCommandHandlerTests.CreateProduct(price: 10m);
            order.AddItem(product, 2);
            DbContext.Orders.Add(order);
            await DbContext.SaveChangesAsync();

            var handler = new UpdateOrderItemQuantityCommandHandler(Db, new FakeTableNotificationService(), CurrentUser);
            await handler.Handle(new UpdateOrderItemQuantityCommand { OrderId = order.Id, ProductId = product.Id, Quantity = 5 }, CancellationToken.None);

            Assert.Equal(50m, order.TotalPrice);
        }
    }

    public class UpdateOrderStatusHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithValidStatus_UpdatesStatusAndSaves()
        {
            Order order = OrderCommandHandlerTests.CreateOrder();
            order.AddItem(OrderCommandHandlerTests.CreateProduct(), 1);
            DbContext.Orders.Add(order);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new UpdateOrderStatusCommandHandler(Db, new FakeTableNotificationService(), new FakeCashierNotificationService(), CurrentUser);
            await handler.Handle(new UpdateOrderStatusCommand { OrderId = order.Id, Status = (int)OrderStatus.Preparing }, CancellationToken.None);

            Assert.Equal(OrderStatus.Preparing, order.Status);
        }
    }

    public class TransferOrderHandlerTests : ApplicationTestBase
    {
        private TransferOrderCommandHandler CreateHandler() =>
            new(Db, new OrderQueries(Db), new FakeTableNotificationService(), new FakeCashierNotificationService(), CurrentUser);

        [Fact]
        public async Task Handle_MoveToAvailableTable_MovesOrderAndSwapsTableStatus()
        {
            Table source = CreateTable();
            source.Occupy();
            Table destination = CreateTable();
            Order order = CreateOrder(source.Id);
            order.AddItem(CreateProduct(), 2);
            DbContext.Tables.AddRange(source, destination);
            DbContext.Orders.Add(order);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = CreateHandler();
            var result = await handler.Handle(new TransferOrderCommand { SourceTableId = source.Id, DestinationTableId = destination.Id, Mode = TableTransferMode.Move }, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(destination.Id, order.TableId);
            Assert.Equal(TableStatus.Available, source.Status);
            Assert.Equal(TableStatus.Occupied, destination.Status);
        }

        [Fact]
        public async Task Handle_MoveToOccupiedTable_ReturnsFailureResult()
        {
            Table source = CreateTable();
            source.Occupy();
            Table destination = CreateTable();
            destination.Occupy();
            Order sourceOrder = CreateOrder(source.Id);
            sourceOrder.AddItem(CreateProduct(), 1);
            Order destinationOrder = CreateOrder(destination.Id);
            destinationOrder.AddItem(CreateProduct(), 1);
            DbContext.Tables.AddRange(source, destination);
            DbContext.Orders.AddRange(sourceOrder, destinationOrder);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = CreateHandler();
            var result = await handler.Handle(new TransferOrderCommand { SourceTableId = source.Id, DestinationTableId = destination.Id, Mode = TableTransferMode.Move }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }

        [Fact]
        public async Task Handle_MergeWithMatchingLine_CombinesQuantityAndClosesSource()
        {
            Table source = CreateTable();
            source.Occupy();
            Table destination = CreateTable();
            destination.Occupy();
            Product product = CreateProduct(price: 10m);

            Order sourceOrder = CreateOrder(source.Id);
            sourceOrder.AddItem(product, 2);
            Order destinationOrder = CreateOrder(destination.Id);
            destinationOrder.AddItem(product, 3);

            DbContext.Tables.AddRange(source, destination);
            DbContext.Orders.AddRange(sourceOrder, destinationOrder);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = CreateHandler();
            var result = await handler.Handle(new TransferOrderCommand { SourceTableId = source.Id, DestinationTableId = destination.Id, Mode = TableTransferMode.Merge }, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Single(destinationOrder.OrderItems);
            Assert.Equal(5, destinationOrder.OrderItems.First().Quantity);
            Assert.Equal(50m, destinationOrder.TotalPrice);
            Assert.Equal(OrderStatus.Cancelled, sourceOrder.Status);
            Assert.Equal(TableStatus.Available, source.Status);
            Assert.Equal(TableStatus.Occupied, destination.Status);
        }

        [Fact]
        public async Task Handle_MergeWithDifferentStatusLines_KeepsSeparateLines()
        {
            Table source = CreateTable();
            source.Occupy();
            Table destination = CreateTable();
            destination.Occupy();
            Product product = CreateProduct(price: 10m);

            Order sourceOrder = CreateOrder(source.Id);
            sourceOrder.AddItem(product, 2);
            sourceOrder.UpdateStatus(OrderStatus.Preparing);
            Order destinationOrder = CreateOrder(destination.Id);
            destinationOrder.AddItem(product, 3);

            DbContext.Tables.AddRange(source, destination);
            DbContext.Orders.AddRange(sourceOrder, destinationOrder);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = CreateHandler();
            var result = await handler.Handle(new TransferOrderCommand { SourceTableId = source.Id, DestinationTableId = destination.Id, Mode = TableTransferMode.Merge }, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(2, destinationOrder.OrderItems.Count);
            Assert.Equal(50m, destinationOrder.TotalPrice);
        }

        [Fact]
        public async Task Handle_Swap_ExchangesTablesWithoutChangingStatus()
        {
            Table source = CreateTable();
            source.Occupy();
            Table destination = CreateTable();
            destination.Occupy();

            Order sourceOrder = CreateOrder(source.Id);
            sourceOrder.AddItem(CreateProduct(price: 10m), 1);
            Order destinationOrder = CreateOrder(destination.Id);
            destinationOrder.AddItem(CreateProduct(price: 25m), 1);

            DbContext.Tables.AddRange(source, destination);
            DbContext.Orders.AddRange(sourceOrder, destinationOrder);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = CreateHandler();
            var result = await handler.Handle(new TransferOrderCommand { SourceTableId = source.Id, DestinationTableId = destination.Id, Mode = TableTransferMode.Swap }, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(destination.Id, sourceOrder.TableId);
            Assert.Equal(source.Id, destinationOrder.TableId);
            Assert.Equal(TableStatus.Occupied, source.Status);
            Assert.Equal(TableStatus.Occupied, destination.Status);
        }

        [Fact]
        public async Task Handle_WithNoActiveOrderAtSourceTable_ReturnsFailureResult()
        {
            Table source = CreateTable();
            Table destination = CreateTable();
            DbContext.Tables.AddRange(source, destination);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = CreateHandler();
            var result = await handler.Handle(new TransferOrderCommand { SourceTableId = source.Id, DestinationTableId = destination.Id, Mode = TableTransferMode.Move }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class UpdateOrderItemStatusHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingItem_UpdatesStatusAndSaves()
        {
            Order order = OrderCommandHandlerTests.CreateOrder();
            order.AddItem(OrderCommandHandlerTests.CreateProduct(), 1);
            OrderItem item = order.OrderItems.First();
            Guid itemId = Guid.NewGuid();
            SetId(item, itemId);
            DbContext.Orders.Add(order);
            await DbContext.SaveChangesAsync();

            var handler = new UpdateOrderItemStatusCommandHandler(Db, new FakeTableNotificationService(), CurrentUser);
            await handler.Handle(new UpdateOrderItemStatusCommand { OrderId = order.Id, OrderItemId = itemId, Status = (int)OrderItemStatus.Preparing }, CancellationToken.None);

            Assert.Equal(OrderItemStatus.Preparing, item.Status);
        }
    }
}
