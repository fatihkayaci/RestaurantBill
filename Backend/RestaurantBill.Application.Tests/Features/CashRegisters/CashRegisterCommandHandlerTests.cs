using RestaurantBill.Application.Features.CashRegisters.Commands.AddTransactionToCashRegister;
using RestaurantBill.Application.Features.CashRegisters.Commands.CreateCashRegister;
using RestaurantBill.Application.Features.CashRegisters.Commands.DeleteCashRegister;
using RestaurantBill.Application.Features.CashRegisters.Commands.TransferBetweenCashRegisters;
using RestaurantBill.Application.Features.CashRegisters.Commands.UpdateCashRegister;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Application.Tests.Features.CashRegisters;

public class CashRegisterCommandHandlerTests
{
    public class CreateCashRegisterHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithValidCommand_AddsCashRegisterAndSaves()
        {
            await SeedActorAsync();

            var handler = new CreateCashRegisterHandler(Db, CurrentUser);
            var command = new CreateCashRegisterCommand
            {
                Name = "Ana Kasa",
                OpeningBalance = 1000m,
                Status = CashRegisterStatus.Open
            };

            var result = await handler.Handle(command, CancellationToken.None);

            CashRegister saved = Assert.Single(DbContext.CashRegisters.ToList());
            Assert.Equal("Ana Kasa", saved.Name);
            Assert.Equal(1000m, saved.Balance);
            Assert.Equal(CurrentUser.BranchId, saved.BranchId);
            Assert.True(result.IsSuccess);
        }
    }

    public class UpdateCashRegisterHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingRegister_UpdatesAndSaves()
        {
            CashRegister existing = CashRegister.Create("Eski Ad", 500m, Guid.NewGuid());
            DbContext.CashRegisters.Add(existing);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new UpdateCashRegisterHandler(Db, CurrentUser);
            var command = new UpdateCashRegisterCommand
            {
                Id = existing.Id,
                Name = "Yeni Ad",
                Balance = 750m,
                Status = CashRegisterStatus.Closed
            };

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.Equal("Yeni Ad", existing.Name);
            Assert.Equal(750m, existing.Balance);
            Assert.Equal(CashRegisterStatus.Closed, existing.Status);
            Assert.True(result.IsSuccess);
        }

        [Fact]
        public async Task Handle_WithNonExistingRegister_ReturnsFailureResult()
        {
            var handler = new UpdateCashRegisterHandler(Db, CurrentUser);
            var command = new UpdateCashRegisterCommand { Id = Guid.NewGuid(), Name = "Ad", Balance = 0m, Status = CashRegisterStatus.Open };

            var result = await handler.Handle(command, CancellationToken.None);
            Assert.True(result.IsFailure);
        }
    }

    public class DeleteCashRegisterHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingRegister_DeletesAndSaves()
        {
            CashRegister existing = CashRegister.Create("Kasa", 0m, Guid.NewGuid());
            DbContext.CashRegisters.Add(existing);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new DeleteCashRegisterHandler(Db, CurrentUser);
            var command = new DeleteCashRegisterCommand { CashRegisterId = existing.Id };

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.Empty(DbContext.CashRegisters.ToList());
            Assert.True(result.IsSuccess);
        }

        [Fact]
        public async Task Handle_WithPositiveBalance_ThrowsDomainException()
        {
            CashRegister existing = CashRegister.Create("Kasa", 100m, Guid.NewGuid());
            DbContext.CashRegisters.Add(existing);
            await DbContext.SaveChangesAsync();

            var handler = new DeleteCashRegisterHandler(Db, CurrentUser);
            var command = new DeleteCashRegisterCommand { CashRegisterId = existing.Id };

            await Assert.ThrowsAsync<DomainException>(() => handler.Handle(command, CancellationToken.None));
        }

        [Fact]
        public async Task Handle_WithNonExistingRegister_ReturnResultIsFailure()
        {
            var handler = new DeleteCashRegisterHandler(Db, CurrentUser);
            var command = new DeleteCashRegisterCommand { CashRegisterId = Guid.NewGuid() };

            var result = await handler.Handle(command, CancellationToken.None);
            Assert.True(result.IsFailure);
        }
    }

    public class AddTransactionHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithOpenRegister_AddsTransactionAndSaves()
        {
            CashRegister register = CashRegister.Create("Kasa", 500m, Guid.NewGuid());
            DbContext.CashRegisters.Add(register);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new AddTransactionToCashRegisterCommandHandler(Db, CurrentUser);
            var command = new AddTransactionToCashRegisterCommand
            {
                CashRegisterId = register.Id,
                Type = CashTransactionType.In,
                Amount = 200m
            };

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.Equal(700m, register.Balance);
            Assert.Single(DbContext.CashTransactions.ToList());
            Assert.True(result.IsSuccess);
        }

        [Fact]
        public async Task Handle_WithClosedRegister_ThrowsDomainException()
        {
            CashRegister register = CashRegister.Create("Kasa", 500m, Guid.NewGuid());
            register.Update("Kasa", 500m, CashRegisterStatus.Closed);
            DbContext.CashRegisters.Add(register);
            await DbContext.SaveChangesAsync();

            var handler = new AddTransactionToCashRegisterCommandHandler(Db, CurrentUser);
            var command = new AddTransactionToCashRegisterCommand
            {
                CashRegisterId = register.Id,
                Type = CashTransactionType.In,
                Amount = 100m
            };

            await Assert.ThrowsAsync<DomainException>(() => handler.Handle(command, CancellationToken.None));
        }
    }

    public class TransferBetweenCashRegistersHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithValidCommand_MovesBalanceAndSaves()
        {
            Guid branchId = CurrentUser.BranchId;
            CashRegister source = CashRegister.Create("Kasa A", 300m, branchId);
            CashRegister destination = CashRegister.Create("Kasa B", 100m, branchId);
            DbContext.CashRegisters.Add(source);
            DbContext.CashRegisters.Add(destination);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new TransferBetweenCashRegistersCommandHandler(Db, CurrentUser);
            var command = new TransferBetweenCashRegistersCommand
            {
                SourceCashRegisterId = source.Id,
                DestinationCashRegisterId = destination.Id,
                Amount = 120m
            };

            await handler.Handle(command, CancellationToken.None);

            Assert.Equal(180m, source.Balance);
            Assert.Equal(220m, destination.Balance);
            Assert.Equal(2, DbContext.CashTransactions.ToList().Count);
        }

        [Fact]
        public async Task Handle_WithInsufficientSourceBalance_ThrowsDomainException()
        {
            Guid branchId = CurrentUser.BranchId;
            CashRegister source = CashRegister.Create("Kasa A", 50m, branchId);
            CashRegister destination = CashRegister.Create("Kasa B", 100m, branchId);
            DbContext.CashRegisters.Add(source);
            DbContext.CashRegisters.Add(destination);
            await DbContext.SaveChangesAsync();

            var handler = new TransferBetweenCashRegistersCommandHandler(Db, CurrentUser);
            var command = new TransferBetweenCashRegistersCommand
            {
                SourceCashRegisterId = source.Id,
                DestinationCashRegisterId = destination.Id,
                Amount = 100m
            };

            await Assert.ThrowsAsync<DomainException>(() => handler.Handle(command, CancellationToken.None));
        }

        [Fact]
        public async Task Handle_WithRegisterFromAnotherRestaurant_ReturnsFailureResult()
        {
            Guid branchId = CurrentUser.BranchId;
            Guid otherBranchId = Guid.NewGuid();
            CashRegister source = CashRegister.Create("Kasa A", 300m, branchId);
            CashRegister destination = CashRegister.Create("Kasa B", 100m, otherBranchId);
            DbContext.CashRegisters.Add(source);
            DbContext.CashRegisters.Add(destination);
            await DbContext.SaveChangesAsync();

            var handler = new TransferBetweenCashRegistersCommandHandler(Db, CurrentUser);
            var command = new TransferBetweenCashRegistersCommand
            {
                SourceCashRegisterId = source.Id,
                DestinationCashRegisterId = destination.Id,
                Amount = 50m
            };

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
        }

        [Fact]
        public async Task Handle_WithNonExistingDestinationRegister_ReturnsFailureResult()
        {
            Guid branchId = CurrentUser.BranchId;
            CashRegister source = CashRegister.Create("Kasa A", 300m, branchId);
            DbContext.CashRegisters.Add(source);
            await DbContext.SaveChangesAsync();

            var handler = new TransferBetweenCashRegistersCommandHandler(Db, CurrentUser);
            var command = new TransferBetweenCashRegistersCommand
            {
                SourceCashRegisterId = source.Id,
                DestinationCashRegisterId = Guid.NewGuid(),
                Amount = 50m
            };

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }
}
