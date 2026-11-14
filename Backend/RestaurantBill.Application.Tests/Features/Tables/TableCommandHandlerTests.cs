using RestaurantBill.Application.Features.Tables.Commands.BulkCreateTables;
using RestaurantBill.Application.Features.Tables.Commands.CancelReservationToTable;
using RestaurantBill.Application.Features.Tables.Commands.CreateTable;
using RestaurantBill.Application.Features.Tables.Commands.DeleteTable;
using RestaurantBill.Application.Features.Orders.Queries;
using RestaurantBill.Application.Features.Tables.Commands.OpenTable;
using RestaurantBill.Application.Features.Tables.Commands.ReservationTable;
using RestaurantBill.Application.Features.Tables.Commands.UpdateTable;
using RestaurantBill.Application.Features.Tables.Queries;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Application.Tests.Features.Tables;

public class TableCommandHandlerTests
{
    private static Table CreateTable(Guid regionId, Guid? id = null)
    {
        var table = Table.Create("Masa 1", "", regionId);
        var prop = typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!;
        prop.SetValue(table, id ?? Guid.NewGuid());
        return table;
    }

    public class CreateTableHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithValidCommand_AddsTableAndSaves()
        {
            await SeedActorAsync();
            var handler = new CreateTableCommandHandler(Db, CurrentUser);
            Guid regionId = await DefaultRegionIdAsync();

            await handler.Handle(new CreateTableCommand { Name = "Masa 1", RegionId = regionId }, CancellationToken.None);

            Table saved = Assert.Single(DbContext.Tables.ToList());
            Assert.Equal(regionId, saved.RegionId);
        }
    }

    public class BulkCreateTablesHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithValidCommand_CreatesNumberedTables()
        {
            await SeedActorAsync();
            Guid regionId = await DefaultRegionIdAsync();
            var handler = new BulkCreateTablesCommandHandler(Db, CurrentUser);

            var result = await handler.Handle(new BulkCreateTablesCommand { RegionId = regionId, Prefix = "Masa", StartNumber = 1, Count = 20 }, CancellationToken.None);

            Assert.True(result.IsSuccess);
            List<Table> saved = DbContext.Tables.ToList();
            Assert.Equal(20, saved.Count);
            Assert.All(saved, t => Assert.Equal(regionId, t.RegionId));
            Assert.Contains(saved, t => t.Name == "Masa 1");
            Assert.Contains(saved, t => t.Name == "Masa 20");
            Assert.Single(DbContext.AuditLogs.ToList());
        }

        [Fact]
        public async Task Handle_WithExistingNames_SkipsThemAndReportsSkipped()
        {
            await SeedActorAsync();
            Guid regionId = await DefaultRegionIdAsync();
            DbContext.Tables.Add(Table.Create("Masa 2", "", regionId));
            await DbContext.SaveChangesAsync();
            var handler = new BulkCreateTablesCommandHandler(Db, CurrentUser);

            var result = await handler.Handle(new BulkCreateTablesCommand { RegionId = regionId, Prefix = "Masa", StartNumber = 1, Count = 3 }, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(["Masa 1", "Masa 3"], result.Value!.CreatedNames);
            Assert.Equal(["Masa 2"], result.Value.SkippedNames);
            Assert.Equal(3, DbContext.Tables.Count());
        }

        [Fact]
        public async Task Handle_WhenAllNamesExist_ReturnsFailure()
        {
            Guid regionId = await DefaultRegionIdAsync();
            DbContext.Tables.Add(Table.Create("Masa 1", "", regionId));
            await DbContext.SaveChangesAsync();
            var handler = new BulkCreateTablesCommandHandler(Db, CurrentUser);

            var result = await handler.Handle(new BulkCreateTablesCommand { RegionId = regionId, Prefix = "Masa", StartNumber = 1, Count = 1 }, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Single(DbContext.Tables.ToList());
        }

        [Fact]
        public async Task Handle_WithAnotherBranchRegion_ReturnsFailureAndCreatesNothing()
        {
            Region otherRegion = await SeedRegionAsync(Guid.NewGuid());
            var handler = new BulkCreateTablesCommandHandler(Db, CurrentUser);

            var result = await handler.Handle(new BulkCreateTablesCommand { RegionId = otherRegion.Id, Prefix = "Masa", StartNumber = 1, Count = 5 }, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Empty(DbContext.Tables.ToList());
        }

        [Theory]
        [InlineData(0)]
        [InlineData(BulkCreateTablesCommand.MaxCount + 1)]
        public void Validator_WithCountOutOfRange_IsInvalid(int count)
        {
            var validator = new BulkCreateTablesCommandValidator();

            var result = validator.Validate(new BulkCreateTablesCommand { RegionId = Guid.NewGuid(), Prefix = "Masa", StartNumber = 1, Count = count });

            Assert.False(result.IsValid);
        }

        [Fact]
        public void Validator_WithMaxCount_IsValid()
        {
            var validator = new BulkCreateTablesCommandValidator();

            var result = validator.Validate(new BulkCreateTablesCommand { RegionId = Guid.NewGuid(), Prefix = "Masa", StartNumber = 1, Count = BulkCreateTablesCommand.MaxCount });

            Assert.True(result.IsValid);
        }
    }

    public class UpdateTableHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingTable_UpdatesAndSaves()
        {
            Table table = CreateTable(await DefaultRegionIdAsync());
            DbContext.Tables.Add(table);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new UpdateCommandHandler(Db, CurrentUser);
            var command = new UpdateTableCommand { Id = table.Id, Name = "Yeni Ad", Status = TableStatus.Reserved, RegionId = (await SeedRegionAsync()).Id };

            await handler.Handle(command, CancellationToken.None);

            Assert.Equal("Yeni Ad", table.Name);
            Assert.Equal(TableStatus.Reserved, table.Status);
        }

        [Fact]
        public async Task Handle_WithNonExistingTable_ReturnsFailureResult()
        {
            var handler = new UpdateCommandHandler(Db, CurrentUser);

            var result = await handler.Handle(new UpdateTableCommand { Id = Guid.NewGuid(), Name = "Ad" }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class DeleteTableHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingTable_DeletesAndSaves()
        {
            Table table = CreateTable(await DefaultRegionIdAsync());
            DbContext.Tables.Add(table);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new DeleteHandler(Db, CurrentUser);
            await handler.Handle(new DeleteTableCommand { TableId = table.Id }, CancellationToken.None);

            Assert.Empty(DbContext.Tables.ToList());
        }

        [Fact]
        public async Task Handle_WithNonExistingTable_ReturnsFailureResult()
        {
            var handler = new DeleteHandler(Db, CurrentUser);

            var result = await handler.Handle(new DeleteTableCommand { TableId = Guid.NewGuid() }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class OpenTableHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithAvailableTable_CreatesOrderAndOccupiesTable()
        {
            Table table = CreateTable(await DefaultRegionIdAsync());
            DbContext.Tables.Add(table);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new OpenTableHandler(Db, new OrderQueries(Db), new FakeTableNotificationService(), new FakeCashierNotificationService(), CurrentUser);
            await handler.Handle(new OpenTableCommand { TableId = table.Id }, CancellationToken.None);

            Assert.Equal(TableStatus.Occupied, table.Status);
            Assert.Single(DbContext.Orders.ToList());
        }

        [Fact]
        public async Task Handle_WithNonExistingTable_ReturnsFailureResult()
        {
            var handler = new OpenTableHandler(Db, new OrderQueries(Db), new FakeTableNotificationService(), new FakeCashierNotificationService(), CurrentUser);

            var result = await handler.Handle(new OpenTableCommand { TableId = Guid.NewGuid() }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }

        [Fact]
        public async Task Handle_WhenTableOccupiedWithActiveOrder_ReturnsExistingOrderIdempotently()
        {
            Table table = CreateTable(await DefaultRegionIdAsync());
            DbContext.Tables.Add(table);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new OpenTableHandler(Db, new OrderQueries(Db), new FakeTableNotificationService(), new FakeCashierNotificationService(), CurrentUser);
            var firstResult = await handler.Handle(new OpenTableCommand { TableId = table.Id }, CancellationToken.None);

            var secondResult = await handler.Handle(new OpenTableCommand { TableId = table.Id }, CancellationToken.None);

            Assert.True(secondResult.IsSuccess);
            Assert.Equal(firstResult.Value, secondResult.Value);
            Assert.Equal(TableStatus.Occupied, table.Status);
            Assert.Single(DbContext.Orders.ToList());
        }

        [Fact]
        public async Task Handle_WhenTableOccupiedWithNoActiveOrder_SelfHealsAndCreatesNewOrder()
        {
            Table table = CreateTable(await DefaultRegionIdAsync());
            table.Occupy();
            DbContext.Tables.Add(table);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new OpenTableHandler(Db, new OrderQueries(Db), new FakeTableNotificationService(), new FakeCashierNotificationService(), CurrentUser);
            var result = await handler.Handle(new OpenTableCommand { TableId = table.Id }, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(TableStatus.Occupied, table.Status);
            Assert.Single(DbContext.Orders.ToList());
        }
    }

    public class ReservationTableHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingTable_SetsStatusToReserved()
        {
            Table table = CreateTable(await DefaultRegionIdAsync());
            DbContext.Tables.Add(table);
            await DbContext.SaveChangesAsync();

            var handler = new ReservationTableCommandHandler(Db, new FakeTableNotificationService(), CurrentUser);
            await handler.Handle(new ReservationTableCommand
            {
                TableId = table.Id,
                GuestName = "Ahmet Yılmaz",
                Contact = "0555 555 55 55",
                ReservationTime = "19:30",
                Note = ""
            }, CancellationToken.None);

            Assert.Equal(TableStatus.Reserved, table.Status);
        }

        [Fact]
        public async Task Handle_WithOccupiedTable_ThrowsDomainExceptionAndLeavesTableOccupied()
        {
            Table table = CreateTable(await DefaultRegionIdAsync());
            table.Occupy();
            DbContext.Tables.Add(table);
            await DbContext.SaveChangesAsync();

            var handler = new ReservationTableCommandHandler(Db, new FakeTableNotificationService(), CurrentUser);

            await Assert.ThrowsAsync<DomainException>(() => handler.Handle(new ReservationTableCommand
            {
                TableId = table.Id,
                GuestName = "Ahmet Yılmaz",
                Contact = "0555 555 55 55",
                ReservationTime = "19:30",
                Note = ""
            }, CancellationToken.None));

            Assert.Equal(TableStatus.Occupied, table.Status);
        }
    }

    public class CancelReservationHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithReservedTable_ReleasesTable()
        {
            Table table = CreateTable(await DefaultRegionIdAsync());
            table.Reserve();
            DbContext.Tables.Add(table);
            await DbContext.SaveChangesAsync();

            var handler = new CancelReservationCommandHandler(Db, new ReservationQueries(Db), new FakeTableNotificationService(), CurrentUser);
            await handler.Handle(new CancelReservationCommand { TableId = table.Id }, CancellationToken.None);

            Assert.Equal(TableStatus.Available, table.Status);
        }

        [Fact]
        public async Task Handle_WithNonExistingTable_ReturnsFailureResult()
        {
            var handler = new CancelReservationCommandHandler(Db, new ReservationQueries(Db), new FakeTableNotificationService(), CurrentUser);

            var result = await handler.Handle(new CancelReservationCommand { TableId = Guid.NewGuid() }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }
}
