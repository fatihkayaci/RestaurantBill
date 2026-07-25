using RestaurantBill.Application.Features.Tables.Commands.CancelReservationToTable;
using RestaurantBill.Application.Features.Tables.Commands.CreateTable;
using RestaurantBill.Application.Features.Tables.Commands.DeleteTable;
using RestaurantBill.Application.Features.Tables.Commands.OpenTable;
using RestaurantBill.Application.Features.Tables.Commands.ReservationTable;
using RestaurantBill.Application.Features.Tables.Commands.UpdateTable;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Tables;

public class TableCommandHandlerTests
{
    private static Table CreateTable(int id = 1)
    {
        var table = Table.Create("Masa 1", "", restaurantId: 1);
        var prop = typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!;
        prop.SetValue(table, id);
        return table;
    }

    public class CreateTableHandlerTests
    {
        [Fact]
        public async Task Handle_WithValidCommand_AddsTableAndSaves()
        {
            var uow = new FakeUnitOfWork();
            var handler = new CreateTableCommandHandler(uow, new FakeCurrentUserService { RestaurantId = 2 });

            await handler.Handle(new CreateTableCommand { Name = "Masa 1", RegionId = 1 }, CancellationToken.None);

            Assert.Single(uow.TableRepo.Added);
            Assert.Equal(2, uow.TableRepo.Added[0].RestaurantId);
            Assert.True(uow.SaveChangesCalled);
        }
    }

    public class UpdateTableHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingTable_UpdatesAndSaves()
        {
            var uow = new FakeUnitOfWork();
            Table table = CreateTable();
            await uow.TableRepo.AddAsync(table);

            var handler = new UpdateCommandHandler(uow);
            var command = new UpdateTableCommand { Id = table.Id, Name = "Yeni Ad", Status = TableStatus.Reserved, RegionId = 1 };

            await handler.Handle(command, CancellationToken.None);

            Assert.Equal("Yeni Ad", table.Name);
            Assert.Equal(TableStatus.Reserved, table.Status);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithNonExistingTable_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            var handler = new UpdateCommandHandler(uow);

            var result = await handler.Handle(new UpdateTableCommand { Id = 99, Name = "Ad" }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class DeleteTableHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingTable_DeletesAndSaves()
        {
            var uow = new FakeUnitOfWork();
            Table table = CreateTable();
            await uow.TableRepo.AddAsync(table);

            var handler = new DeleteHandler(uow);
            await handler.Handle(new DeleteTableCommand { TableId = table.Id }, CancellationToken.None);

            Assert.Empty(uow.TableRepo.Added);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithNonExistingTable_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            var handler = new DeleteHandler(uow);

            var result = await handler.Handle(new DeleteTableCommand { TableId = 99 }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class OpenTableHandlerTests
    {
        [Fact]
        public async Task Handle_WithAvailableTable_CreatesOrderAndOccupiesTable()
        {
            var uow = new FakeUnitOfWork();
            Table table = CreateTable();
            await uow.TableRepo.AddAsync(table);

            var handler = new OpenTableHandler(uow, new FakeTableNotificationService(), new FakeCashierNotificationService(), new FakeCurrentUserService());
            await handler.Handle(new OpenTableCommand { TableId = table.Id }, CancellationToken.None);

            Assert.Equal(TableStatus.Occupied, table.Status);
            Assert.Single(uow.OrderRepo.Added);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithNonExistingTable_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            var handler = new OpenTableHandler(uow, new FakeTableNotificationService(), new FakeCashierNotificationService(), new FakeCurrentUserService());

            var result = await handler.Handle(new OpenTableCommand { TableId = 99 }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class ReservationTableHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingTable_SetsStatusToReserved()
        {
            var uow = new FakeUnitOfWork();
            Table table = CreateTable();
            await uow.TableRepo.AddAsync(table);

            var handler = new ReservationTableCommandHandler(uow, new FakeTableNotificationService(), new FakeCurrentUserService());
            await handler.Handle(new ReservationTableCommand
            {
                TableId = table.Id,
                GuestName = "Ahmet Yılmaz",
                Contact = "0555 555 55 55",
                ReservationTime = "19:30",
                Note = ""
            }, CancellationToken.None);

            Assert.Equal(TableStatus.Reserved, table.Status);
            Assert.True(uow.SaveChangesCalled);
        }
    }

    public class CancelReservationHandlerTests
    {
        [Fact]
        public async Task Handle_WithReservedTable_ReleasesTable()
        {
            var uow = new FakeUnitOfWork();
            Table table = CreateTable();
            table.Reserve();
            await uow.TableRepo.AddAsync(table);

            var handler = new CancelReservationCommandHandler(uow, new FakeTableNotificationService(), new FakeCurrentUserService());
            await handler.Handle(new CancelReservationCommand { TableId = table.Id }, CancellationToken.None);

            Assert.Equal(TableStatus.Available, table.Status);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithNonExistingTable_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            var handler = new CancelReservationCommandHandler(uow, new FakeTableNotificationService(), new FakeCurrentUserService());

            var result = await handler.Handle(new CancelReservationCommand { TableId = 99 }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }
}
