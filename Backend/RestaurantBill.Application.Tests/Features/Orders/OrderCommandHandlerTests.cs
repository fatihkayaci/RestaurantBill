using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder;
using RestaurantBill.Application.Features.Orders.Commands.CancelOrder;
using RestaurantBill.Application.Features.Orders.Commands.CloseOrder;
using RestaurantBill.Application.Features.Orders.Commands.CreateOrder;
using RestaurantBill.Application.Features.Orders.Commands.RemoveProductFromOrder;
using RestaurantBill.Application.Features.Orders.Commands.TransferOrder;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemQuantity;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemStatus;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemsStatus;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus;
using RestaurantBill.Application.Features.Orders.Queries;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Orders;

public class OrderCommandHandlerTests
{
    private static Table CreateTable(Guid regionId, Guid? tableId = null)
    {
        var table = Table.Create("Masa 1", "", regionId);
        SetId(table, tableId ?? Guid.NewGuid());
        return table;
    }

    private static Order CreateOrder(Guid tableId, Guid branchId)
    {
        var order = Order.Create(tableId, branchId);
        SetId(order, Guid.NewGuid());
        return order;
    }

    private static Product CreateProduct(Guid? id = null, decimal price = 20m, Guid? categoryId = null)
    {
        var product = Product.Create("Ürün", price, "img.png", categoryId ?? Guid.NewGuid());
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
            Table table = CreateTable(await DefaultRegionIdAsync());
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
            Table table = OrderCommandHandlerTests.CreateTable(await DefaultRegionIdAsync(), tableId);
            table.Occupy();
            Order order = OrderCommandHandlerTests.CreateOrder(tableId, CurrentUser.BranchId);
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

        [Fact]
        public async Task Handle_WithOrderFromAnotherBranch_ReturnsFailureAndKeepsOrder()
        {
            Region foreignRegion = await SeedRegionAsync(Guid.NewGuid());
            Table foreignTable = OrderCommandHandlerTests.CreateTable(foreignRegion.Id);
            foreignTable.Occupy();
            Order foreignOrder = OrderCommandHandlerTests.CreateOrder(foreignTable.Id, foreignRegion.BranchId);
            DbContext.Tables.Add(foreignTable);
            DbContext.Orders.Add(foreignOrder);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new CancelOrderCommandHandler(Db, new FakeTableNotificationService(), new FakeCashierNotificationService(), CurrentUser);
            var result = await handler.Handle(new CancelOrderCommand { OrderId = foreignOrder.Id }, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal(OrderStatus.Active, foreignOrder.Status);
        }
    }

    public class CloseOrderHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingOrder_ClosesOrderAndReleasesTable()
        {
            Guid tableId = Guid.NewGuid();
            Table table = CreateTable(await DefaultRegionIdAsync(), tableId);
            table.Occupy();
            Order order = CreateOrder(tableId, CurrentUser.BranchId);
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
            Order order = OrderCommandHandlerTests.CreateOrder((await SeedTableAsync()).Id, CurrentUser.BranchId);
            Product product = OrderCommandHandlerTests.CreateProduct(price: 15m, categoryId: await DefaultCategoryIdAsync());
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
            Order order = OrderCommandHandlerTests.CreateOrder((await SeedTableAsync()).Id, CurrentUser.BranchId);
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
            Order order = OrderCommandHandlerTests.CreateOrder((await SeedTableAsync()).Id, CurrentUser.BranchId);
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
            Order order = OrderCommandHandlerTests.CreateOrder((await SeedTableAsync()).Id, CurrentUser.BranchId);
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
            Table source = CreateTable(await DefaultRegionIdAsync());
            source.Occupy();
            Table destination = CreateTable(await DefaultRegionIdAsync());
            Order order = CreateOrder(source.Id, CurrentUser.BranchId);
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
            Table source = CreateTable(await DefaultRegionIdAsync());
            source.Occupy();
            Table destination = CreateTable(await DefaultRegionIdAsync());
            destination.Occupy();
            Order sourceOrder = CreateOrder(source.Id, CurrentUser.BranchId);
            sourceOrder.AddItem(CreateProduct(), 1);
            Order destinationOrder = CreateOrder(destination.Id, CurrentUser.BranchId);
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
            Table source = CreateTable(await DefaultRegionIdAsync());
            source.Occupy();
            Table destination = CreateTable(await DefaultRegionIdAsync());
            destination.Occupy();
            Product product = CreateProduct(price: 10m);

            Order sourceOrder = CreateOrder(source.Id, CurrentUser.BranchId);
            sourceOrder.AddItem(product, 2);
            Order destinationOrder = CreateOrder(destination.Id, CurrentUser.BranchId);
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
            Table source = CreateTable(await DefaultRegionIdAsync());
            source.Occupy();
            Table destination = CreateTable(await DefaultRegionIdAsync());
            destination.Occupy();
            Product product = CreateProduct(price: 10m);

            Order sourceOrder = CreateOrder(source.Id, CurrentUser.BranchId);
            sourceOrder.AddItem(product, 2);
            sourceOrder.UpdateStatus(OrderStatus.Preparing);
            Order destinationOrder = CreateOrder(destination.Id, CurrentUser.BranchId);
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
            Table source = CreateTable(await DefaultRegionIdAsync());
            source.Occupy();
            Table destination = CreateTable(await DefaultRegionIdAsync());
            destination.Occupy();

            Order sourceOrder = CreateOrder(source.Id, CurrentUser.BranchId);
            sourceOrder.AddItem(CreateProduct(price: 10m), 1);
            Order destinationOrder = CreateOrder(destination.Id, CurrentUser.BranchId);
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
            Table source = CreateTable(await DefaultRegionIdAsync());
            Table destination = CreateTable(await DefaultRegionIdAsync());
            DbContext.Tables.AddRange(source, destination);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = CreateHandler();
            var result = await handler.Handle(new TransferOrderCommand { SourceTableId = source.Id, DestinationTableId = destination.Id, Mode = TableTransferMode.Move }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class UpdateOrderItemStatusHandlerTests : ReadyTestBase
    {
        [Fact]
        public async Task Handle_WithExistingItem_UpdatesStatusAndSaves()
        {
            Order order = OrderCommandHandlerTests.CreateOrder((await SeedTableAsync()).Id, CurrentUser.BranchId);
            order.AddItem(OrderCommandHandlerTests.CreateProduct(), 1);
            OrderItem item = order.OrderItems.First();
            Guid itemId = Guid.NewGuid();
            SetId(item, itemId);
            DbContext.Orders.Add(order);
            await DbContext.SaveChangesAsync();

            var handler = new UpdateOrderItemStatusCommandHandler(Db, new FakeTableNotificationService(), new FakeCashierNotificationService(), CurrentUser);
            await handler.Handle(new UpdateOrderItemStatusCommand { OrderId = order.Id, OrderItemId = itemId, Status = (int)OrderItemStatus.Preparing }, CancellationToken.None);

            Assert.Equal(OrderItemStatus.Preparing, item.Status);
        }

        [Fact]
        public async Task Handle_ItemBecomesReady_NotifiesWaitersWithTableAndProduct()
        {
            (Order order, Table table) = await SeedReadyOrderAsync(("Adana Kebap", 2));
            OrderItem item = order.OrderItems.Single();
            var notifications = new FakeTableNotificationService();
            var handler = new UpdateOrderItemStatusCommandHandler(Db, notifications, new FakeCashierNotificationService(), CurrentUser);

            var result = await handler.Handle(new UpdateOrderItemStatusCommand { OrderId = order.Id, OrderItemId = item.Id, Status = (int)OrderItemStatus.Ready }, CancellationToken.None);

            Assert.True(result.IsSuccess);
            (Guid branchId, ItemsReadyDto payload) = Assert.Single(notifications.ItemsReadySent);
            Assert.Equal(CurrentUser.BranchId, branchId);
            Assert.Equal(order.Id, payload.OrderId);
            Assert.Equal(table.Id, payload.TableId);
            Assert.Equal(table.Name, payload.TableName);
            Assert.Equal(table.RegionId, payload.RegionId);
            ReadyOrderItemDto ready = Assert.Single(payload.Items);
            Assert.Equal(item.Id, ready.OrderItemId);
            Assert.Equal("Adana Kebap", ready.ProductName);
            Assert.Equal(2, ready.Quantity);
        }

        [Fact]
        public async Task Handle_ItemAlreadyReady_DoesNotNotifyAgain()
        {
            (Order order, _) = await SeedReadyOrderAsync(("Adana Kebap", 1));
            OrderItem item = order.OrderItems.Single();
            item.UpdateStatus(OrderItemStatus.Ready);
            await DbContext.SaveChangesAsync();
            var notifications = new FakeTableNotificationService();
            var handler = new UpdateOrderItemStatusCommandHandler(Db, notifications, new FakeCashierNotificationService(), CurrentUser);

            var result = await handler.Handle(new UpdateOrderItemStatusCommand { OrderId = order.Id, OrderItemId = item.Id, Status = (int)OrderItemStatus.Ready }, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Empty(notifications.ItemsReadySent);
        }

        [Fact]
        public async Task Handle_StatusOtherThanReady_DoesNotNotify()
        {
            (Order order, _) = await SeedReadyOrderAsync(("Adana Kebap", 1));
            OrderItem item = order.OrderItems.Single();
            item.UpdateStatus(OrderItemStatus.Ready);
            await DbContext.SaveChangesAsync();
            var notifications = new FakeTableNotificationService();
            var handler = new UpdateOrderItemStatusCommandHandler(Db, notifications, new FakeCashierNotificationService(), CurrentUser);

            await handler.Handle(new UpdateOrderItemStatusCommand { OrderId = order.Id, OrderItemId = item.Id, Status = (int)OrderItemStatus.Served }, CancellationToken.None);
            await handler.Handle(new UpdateOrderItemStatusCommand { OrderId = order.Id, OrderItemId = item.Id, Status = (int)OrderItemStatus.Preparing }, CancellationToken.None);

            Assert.Empty(notifications.ItemsReadySent);
        }

        // Pasadan geri alınıp yeniden hazır yapılan ürün yeniden bildirilir.
        [Fact]
        public async Task Handle_ReadyAfterUndo_NotifiesAgain()
        {
            (Order order, _) = await SeedReadyOrderAsync(("Adana Kebap", 1));
            OrderItem item = order.OrderItems.Single();
            var notifications = new FakeTableNotificationService();
            var handler = new UpdateOrderItemStatusCommandHandler(Db, notifications, new FakeCashierNotificationService(), CurrentUser);

            await handler.Handle(new UpdateOrderItemStatusCommand { OrderId = order.Id, OrderItemId = item.Id, Status = (int)OrderItemStatus.Ready }, CancellationToken.None);
            await handler.Handle(new UpdateOrderItemStatusCommand { OrderId = order.Id, OrderItemId = item.Id, Status = (int)OrderItemStatus.Pending }, CancellationToken.None);
            await handler.Handle(new UpdateOrderItemStatusCommand { OrderId = order.Id, OrderItemId = item.Id, Status = (int)OrderItemStatus.Ready }, CancellationToken.None);

            Assert.Equal(2, notifications.ItemsReadySent.Count);
        }
    }

    public class UpdateOrderItemsStatusHandlerTests : ReadyTestBase
    {
        [Fact]
        public async Task Handle_SeveralItemsReady_SendsOneEventWithAllOfThem()
        {
            (Order order, _) = await SeedReadyOrderAsync(("Adana Kebap", 2), ("Ayran", 2), ("Künefe", 1));
            List<Guid> ids = order.OrderItems.Select(i => i.Id).ToList();
            var notifications = new FakeTableNotificationService();
            var handler = new UpdateOrderItemsStatusCommandHandler(Db, notifications, new FakeCashierNotificationService(), CurrentUser);

            var result = await handler.Handle(new UpdateOrderItemsStatusCommand { OrderId = order.Id, OrderItemIds = ids, Status = (int)OrderItemStatus.Ready }, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.All(order.OrderItems, i => Assert.Equal(OrderItemStatus.Ready, i.Status));
            (_, ItemsReadyDto payload) = Assert.Single(notifications.ItemsReadySent);
            Assert.Equal(ids.Order(), payload.Items.Select(i => i.OrderItemId).Order());
            Assert.Equal(["Adana Kebap", "Ayran", "Künefe"], payload.Items.Select(i => i.ProductName).Order());
        }

        // Listede zaten hazır olan ürün varsa bildirimde yalnızca yeni hazır olanlar yer alır.
        [Fact]
        public async Task Handle_MixOfReadyAndWaiting_NotifiesOnlyNewlyReady()
        {
            (Order order, _) = await SeedReadyOrderAsync(("Adana Kebap", 1), ("Ayran", 1));
            OrderItem kebap = order.OrderItems.Single(i => i.Product?.Name == "Adana Kebap");
            OrderItem ayran = order.OrderItems.Single(i => i.Product?.Name == "Ayran");
            kebap.UpdateStatus(OrderItemStatus.Ready);
            await DbContext.SaveChangesAsync();
            var notifications = new FakeTableNotificationService();
            var handler = new UpdateOrderItemsStatusCommandHandler(Db, notifications, new FakeCashierNotificationService(), CurrentUser);

            await handler.Handle(new UpdateOrderItemsStatusCommand { OrderId = order.Id, OrderItemIds = [kebap.Id, ayran.Id], Status = (int)OrderItemStatus.Ready }, CancellationToken.None);

            (_, ItemsReadyDto payload) = Assert.Single(notifications.ItemsReadySent);
            Assert.Equal(ayran.Id, Assert.Single(payload.Items).OrderItemId);
        }

        [Fact]
        public async Task Handle_StatusOtherThanReady_UpdatesWithoutNotifying()
        {
            (Order order, _) = await SeedReadyOrderAsync(("Adana Kebap", 1), ("Ayran", 1));
            foreach (OrderItem item in order.OrderItems) item.UpdateStatus(OrderItemStatus.Ready);
            await DbContext.SaveChangesAsync();
            var notifications = new FakeTableNotificationService();
            var handler = new UpdateOrderItemsStatusCommandHandler(Db, notifications, new FakeCashierNotificationService(), CurrentUser);

            var result = await handler.Handle(new UpdateOrderItemsStatusCommand { OrderId = order.Id, OrderItemIds = order.OrderItems.Select(i => i.Id).ToList(), Status = (int)OrderItemStatus.Served }, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.All(order.OrderItems, i => Assert.Equal(OrderItemStatus.Served, i.Status));
            Assert.Empty(notifications.ItemsReadySent);
        }

        [Fact]
        public async Task Handle_UnknownItem_FailsAndChangesNothing()
        {
            (Order order, _) = await SeedReadyOrderAsync(("Adana Kebap", 1));
            OrderItem item = order.OrderItems.Single();
            var notifications = new FakeTableNotificationService();
            var handler = new UpdateOrderItemsStatusCommandHandler(Db, notifications, new FakeCashierNotificationService(), CurrentUser);

            var result = await handler.Handle(new UpdateOrderItemsStatusCommand { OrderId = order.Id, OrderItemIds = [item.Id, Guid.NewGuid()], Status = (int)OrderItemStatus.Ready }, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal(OrderItemStatus.Pending, item.Status);
            Assert.Empty(notifications.ItemsReadySent);
        }
    }

    public class UpdateOrderStatusReadyNotificationTests : ReadyTestBase
    {
        // "Tümü hazır": siparişin bekleyen bütün ürünleri tek bildirimde gelir.
        [Fact]
        public async Task Handle_OrderReady_SendsOneEventWithWaitingItems()
        {
            (Order order, _) = await SeedReadyOrderAsync(("Adana Kebap", 2), ("Ayran", 1));
            await SeedActorAsync();
            var notifications = new FakeTableNotificationService();
            var handler = new UpdateOrderStatusCommandHandler(Db, notifications, new FakeCashierNotificationService(), CurrentUser);

            var result = await handler.Handle(new UpdateOrderStatusCommand { OrderId = order.Id, Status = (int)OrderStatus.Ready }, CancellationToken.None);

            Assert.True(result.IsSuccess);
            (_, ItemsReadyDto payload) = Assert.Single(notifications.ItemsReadySent);
            Assert.Equal(2, payload.Items.Count);
        }

        [Fact]
        public async Task Handle_OrderServed_DoesNotNotify()
        {
            (Order order, _) = await SeedReadyOrderAsync(("Adana Kebap", 1));
            order.UpdateStatus(OrderStatus.Ready);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();
            var notifications = new FakeTableNotificationService();
            var handler = new UpdateOrderStatusCommandHandler(Db, notifications, new FakeCashierNotificationService(), CurrentUser);

            await handler.Handle(new UpdateOrderStatusCommand { OrderId = order.Id, Status = (int)OrderStatus.Served }, CancellationToken.None);

            Assert.Empty(notifications.ItemsReadySent);
        }
    }

    // "Ürün hazır" testlerinin ortak verisi: kullanıcının şubesinde bir masa ve adı verilen ürünlerle açık sipariş.
    public abstract class ReadyTestBase : ApplicationTestBase
    {
        protected async Task<(Order order, Table table)> SeedReadyOrderAsync(params (string name, int quantity)[] lines)
        {
            Table table = await SeedTableAsync();
            Order order = Order.Create(table.Id, CurrentUser.BranchId);
            foreach ((string name, int quantity) in lines)
            {
                Product product = Product.Create(name, 100m, "", Guid.NewGuid());
                SetId(product, Guid.NewGuid()); // AddItem aynı Id'li ürünleri tek satırda birleştirir
                order.AddItem(product, quantity);
            }
            DbContext.Orders.Add(order);
            await DbContext.SaveChangesAsync();
            return (order, table);
        }
    }
}
