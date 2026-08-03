using RestaurantBill.Application.Features.CashRegisters.Commands.AddTransactionToCashRegister;
using RestaurantBill.Application.Features.CashRegisters.Commands.CreateCashRegister;
using RestaurantBill.Application.Features.CashRegisters.Commands.DeleteCashRegister;
using RestaurantBill.Application.Features.CashRegisters.Commands.TransferBetweenCashRegisters;
using RestaurantBill.Application.Features.CashRegisters.Commands.UpdateCashRegister;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Application.Tests.Features.CashRegisters;

public class CashRegisterCommandHandlerTests
{
    public class CreateCashRegisterHandlerTests
    {
        [Fact]
        public async Task Handle_WithValidCommand_AddsCashRegisterAndSaves()
        {
            var uow = new FakeUnitOfWork();
            Guid branchId = Guid.NewGuid();
            var currentUser = new FakeCurrentUserService { BranchId = branchId };
            TestActor.Seed(uow, currentUser.UserId);

            var handler = new CreateCashRegisterHandler(uow, currentUser);
            var command = new CreateCashRegisterCommand
            {
                Name = "Ana Kasa",
                OpeningBalance = 1000m,
                Status = CashRegisterStatus.Open
            };

            var result = await handler.Handle(command, CancellationToken.None);
            Assert.Single(uow.CashRegisterRepo.Added);
            Assert.Equal("Ana Kasa", uow.CashRegisterRepo.Added[0].Name);
            Assert.Equal(1000m, uow.CashRegisterRepo.Added[0].Balance);
            Assert.Equal(branchId, uow.CashRegisterRepo.Added[0].BranchId);
            Assert.True(uow.SaveChangesCalled);
            Assert.True(result.IsSuccess);
        }
    }

    public class UpdateCashRegisterHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingRegister_UpdatesAndSaves()
        {
            var uow = new FakeUnitOfWork();
            CashRegister existing = CashRegister.Create("Eski Ad", 500m, Guid.NewGuid());
            await uow.CashRegisterRepo.AddAsync(existing);

            var currentUser = new FakeCurrentUserService();
            TestActor.Seed(uow, currentUser.UserId);
            var handler = new UpdateCashRegisterHandler(uow, currentUser);
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
            Assert.True(uow.SaveChangesCalled);
            Assert.True(result.IsSuccess);

        }

        [Fact]
        public async Task Handle_WithNonExistingRegister_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            var handler = new UpdateCashRegisterHandler(uow, new FakeCurrentUserService());
            var command = new UpdateCashRegisterCommand { Id = Guid.NewGuid(), Name = "Ad", Balance = 0m, Status = CashRegisterStatus.Open };

            var result = await handler.Handle(command, CancellationToken.None);
            Assert.True(result.IsFailure);
        }
    }

    public class DeleteCashRegisterHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingRegister_DeletesAndSaves()
        {
            var uow = new FakeUnitOfWork();
            CashRegister existing = CashRegister.Create("Kasa", 0m, Guid.NewGuid());
            await uow.CashRegisterRepo.AddAsync(existing);

            var currentUser = new FakeCurrentUserService();
            TestActor.Seed(uow, currentUser.UserId);
            var handler = new DeleteCashRegisterHandler(uow, currentUser);
            var command = new DeleteCashRegisterCommand { CashRegisterId = existing.Id };

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.Empty(uow.CashRegisterRepo.Added);
            Assert.True(uow.SaveChangesCalled);
            Assert.True(result.IsSuccess);
        }

        [Fact]
        public async Task Handle_WithPositiveBalance_ThrowsDomainException()
        {
            var uow = new FakeUnitOfWork();
            CashRegister existing = CashRegister.Create("Kasa", 100m, Guid.NewGuid());
            await uow.CashRegisterRepo.AddAsync(existing);

            var handler = new DeleteCashRegisterHandler(uow, new FakeCurrentUserService());
            var command = new DeleteCashRegisterCommand { CashRegisterId = existing.Id };

            await Assert.ThrowsAsync<DomainException>(() => handler.Handle(command, CancellationToken.None));
        }

        [Fact]
        public async Task Handle_WithNonExistingRegister_ReturnResultIsFailure()
        {
            var uow = new FakeUnitOfWork();
            var handler = new DeleteCashRegisterHandler(uow, new FakeCurrentUserService());
            var command = new DeleteCashRegisterCommand { CashRegisterId = Guid.NewGuid() };

            var result = await handler.Handle(command, CancellationToken.None);
            Assert.True(result.IsFailure);
        }
    }

    public class AddTransactionHandlerTests
    {
        [Fact]
        public async Task Handle_WithOpenRegister_AddsTransactionAndSaves()
        {
            var uow = new FakeUnitOfWork();
            CashRegister register = CashRegister.Create("Kasa", 500m, Guid.NewGuid());
            await uow.CashRegisterRepo.AddAsync(register);

            var currentUser = new FakeCurrentUserService { UserId = Guid.NewGuid() };
            TestActor.Seed(uow, currentUser.UserId);
            var handler = new AddTransactionToCashRegisterCommandHandler(uow, currentUser);
            var command = new AddTransactionToCashRegisterCommand
            {
                CashRegisterId = register.Id,
                Type = CashTransactionType.In,
                Amount = 200m
            };

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.Equal(700m, register.Balance);
            Assert.Single(uow.CashTransactionRepo.Added);
            Assert.True(uow.SaveChangesCalled);
            Assert.True(result.IsSuccess);
        }

        [Fact]
        public async Task Handle_WithClosedRegister_ThrowsDomainException()
        {
            var uow = new FakeUnitOfWork();
            CashRegister register = CashRegister.Create("Kasa", 500m, Guid.NewGuid());
            register.Update("Kasa", 500m, CashRegisterStatus.Closed);
            await uow.CashRegisterRepo.AddAsync(register);

            var handler = new AddTransactionToCashRegisterCommandHandler(uow, new FakeCurrentUserService());
            var command = new AddTransactionToCashRegisterCommand
            {
                CashRegisterId = register.Id,
                Type = CashTransactionType.In,
                Amount = 100m
            };

            await Assert.ThrowsAsync<DomainException>(() => handler.Handle(command, CancellationToken.None));
        }
    }

    public class TransferBetweenCashRegistersHandlerTests
    {
        private static void SetId(CashRegister register, Guid id)
        {
            typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(register, id);
        }

        [Fact]
        public async Task Handle_WithValidCommand_MovesBalanceAndSaves()
        {
            var uow = new FakeUnitOfWork();
            Guid branchId = Guid.NewGuid();
            CashRegister source = CashRegister.Create("Kasa A", 300m, branchId);
            CashRegister destination = CashRegister.Create("Kasa B", 100m, branchId);
            Guid sourceId = Guid.NewGuid();
            Guid destinationId = Guid.NewGuid();
            SetId(source, sourceId);
            SetId(destination, destinationId);
            await uow.CashRegisterRepo.AddAsync(source);
            await uow.CashRegisterRepo.AddAsync(destination);

            var currentUser = new FakeCurrentUserService { BranchId = branchId, UserId = Guid.NewGuid() };
            TestActor.Seed(uow, currentUser.UserId);
            var handler = new TransferBetweenCashRegistersCommandHandler(uow, currentUser);
            var command = new TransferBetweenCashRegistersCommand
            {
                SourceCashRegisterId = sourceId,
                DestinationCashRegisterId = destinationId,
                Amount = 120m
            };

            await handler.Handle(command, CancellationToken.None);

            Assert.Equal(180m, source.Balance);
            Assert.Equal(220m, destination.Balance);
            Assert.Equal(2, uow.CashTransactionRepo.Added.Count);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithInsufficientSourceBalance_ThrowsDomainException()
        {
            var uow = new FakeUnitOfWork();
            Guid branchId = Guid.NewGuid();
            CashRegister source = CashRegister.Create("Kasa A", 50m, branchId);
            CashRegister destination = CashRegister.Create("Kasa B", 100m, branchId);
            Guid sourceId = Guid.NewGuid();
            Guid destinationId = Guid.NewGuid();
            SetId(source, sourceId);
            SetId(destination, destinationId);
            await uow.CashRegisterRepo.AddAsync(source);
            await uow.CashRegisterRepo.AddAsync(destination);

            var handler = new TransferBetweenCashRegistersCommandHandler(uow, new FakeCurrentUserService { BranchId = branchId });
            var command = new TransferBetweenCashRegistersCommand
            {
                SourceCashRegisterId = sourceId,
                DestinationCashRegisterId = destinationId,
                Amount = 100m
            };

            await Assert.ThrowsAsync<DomainException>(() => handler.Handle(command, CancellationToken.None));
        }

        [Fact]
        public async Task Handle_WithRegisterFromAnotherRestaurant_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            Guid branchId = Guid.NewGuid();
            Guid otherBranchId = Guid.NewGuid();
            CashRegister source = CashRegister.Create("Kasa A", 300m, branchId);
            CashRegister destination = CashRegister.Create("Kasa B", 100m, otherBranchId);
            Guid sourceId = Guid.NewGuid();
            Guid destinationId = Guid.NewGuid();
            SetId(source, sourceId);
            SetId(destination, destinationId);
            await uow.CashRegisterRepo.AddAsync(source);
            await uow.CashRegisterRepo.AddAsync(destination);

            var handler = new TransferBetweenCashRegistersCommandHandler(uow, new FakeCurrentUserService { BranchId = branchId });
            var command = new TransferBetweenCashRegistersCommand
            {
                SourceCashRegisterId = sourceId,
                DestinationCashRegisterId = destinationId,
                Amount = 50m
            };

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
        }

        [Fact]
        public async Task Handle_WithNonExistingDestinationRegister_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            Guid branchId = Guid.NewGuid();
            CashRegister source = CashRegister.Create("Kasa A", 300m, branchId);
            Guid sourceId = Guid.NewGuid();
            SetId(source, sourceId);
            await uow.CashRegisterRepo.AddAsync(source);

            var handler = new TransferBetweenCashRegistersCommandHandler(uow, new FakeCurrentUserService { BranchId = branchId });
            var command = new TransferBetweenCashRegistersCommand
            {
                SourceCashRegisterId = sourceId,
                DestinationCashRegisterId = Guid.NewGuid(),
                Amount = 50m
            };

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }
}
