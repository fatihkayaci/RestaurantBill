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
            var currentUser = new FakeCurrentUserService { RestaurantId = 5 };
            
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
            Assert.Equal(5, uow.CashRegisterRepo.Added[0].RestaurantId);
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
            CashRegister existing = CashRegister.Create("Eski Ad", 500m, CashRegisterStatus.Open, restaurantId: 1);
            await uow.CashRegisterRepo.AddAsync(existing);

            var handler = new UpdateCashRegisterHandler(uow);
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
            var handler = new UpdateCashRegisterHandler(uow);
            var command = new UpdateCashRegisterCommand { Id = 99, Name = "Ad", Balance = 0m, Status = CashRegisterStatus.Open };

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
            CashRegister existing = CashRegister.Create("Kasa", 0m, CashRegisterStatus.Open, restaurantId: 1);
            await uow.CashRegisterRepo.AddAsync(existing);

            var handler = new DeleteCashRegisterHandler(uow);
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
            CashRegister existing = CashRegister.Create("Kasa", 100m, CashRegisterStatus.Open, restaurantId: 1);
            await uow.CashRegisterRepo.AddAsync(existing);

            var handler = new DeleteCashRegisterHandler(uow);
            var command = new DeleteCashRegisterCommand { CashRegisterId = existing.Id };

            await Assert.ThrowsAsync<DomainException>(() => handler.Handle(command, CancellationToken.None));
        }

        [Fact]
        public async Task Handle_WithNonExistingRegister_ReturnResultIsFailure()
        {
            var uow = new FakeUnitOfWork();
            var handler = new DeleteCashRegisterHandler(uow);
            var command = new DeleteCashRegisterCommand { CashRegisterId = 99 };

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
            CashRegister register = CashRegister.Create("Kasa", 500m, CashRegisterStatus.Open, restaurantId: 1);
            await uow.CashRegisterRepo.AddAsync(register);

            var handler = new AddTransactionToCashRegisterCommandHandler(uow, new FakeCurrentUserService { UserId = 3 });
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
            CashRegister register = CashRegister.Create("Kasa", 500m, CashRegisterStatus.Closed, restaurantId: 1);
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
        private static void SetId(CashRegister register, int id)
        {
            typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(register, id);
        }

        [Fact]
        public async Task Handle_WithValidCommand_MovesBalanceAndSaves()
        {
            var uow = new FakeUnitOfWork();
            CashRegister source = CashRegister.Create("Kasa A", 300m, CashRegisterStatus.Open, restaurantId: 5);
            CashRegister destination = CashRegister.Create("Kasa B", 100m, CashRegisterStatus.Open, restaurantId: 5);
            SetId(source, 1);
            SetId(destination, 2);
            await uow.CashRegisterRepo.AddAsync(source);
            await uow.CashRegisterRepo.AddAsync(destination);

            var handler = new TransferBetweenCashRegistersCommandHandler(uow, new FakeCurrentUserService { RestaurantId = 5, UserId = 3 });
            var command = new TransferBetweenCashRegistersCommand
            {
                SourceCashRegisterId = 1,
                DestinationCashRegisterId = 2,
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
            CashRegister source = CashRegister.Create("Kasa A", 50m, CashRegisterStatus.Open, restaurantId: 5);
            CashRegister destination = CashRegister.Create("Kasa B", 100m, CashRegisterStatus.Open, restaurantId: 5);
            SetId(source, 1);
            SetId(destination, 2);
            await uow.CashRegisterRepo.AddAsync(source);
            await uow.CashRegisterRepo.AddAsync(destination);

            var handler = new TransferBetweenCashRegistersCommandHandler(uow, new FakeCurrentUserService { RestaurantId = 5 });
            var command = new TransferBetweenCashRegistersCommand
            {
                SourceCashRegisterId = 1,
                DestinationCashRegisterId = 2,
                Amount = 100m
            };

            await Assert.ThrowsAsync<DomainException>(() => handler.Handle(command, CancellationToken.None));
        }

        [Fact]
        public async Task Handle_WithRegisterFromAnotherRestaurant_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            CashRegister source = CashRegister.Create("Kasa A", 300m, CashRegisterStatus.Open, restaurantId: 5);
            CashRegister destination = CashRegister.Create("Kasa B", 100m, CashRegisterStatus.Open, restaurantId: 9);
            SetId(source, 1);
            SetId(destination, 2);
            await uow.CashRegisterRepo.AddAsync(source);
            await uow.CashRegisterRepo.AddAsync(destination);

            var handler = new TransferBetweenCashRegistersCommandHandler(uow, new FakeCurrentUserService { RestaurantId = 5 });
            var command = new TransferBetweenCashRegistersCommand
            {
                SourceCashRegisterId = 1,
                DestinationCashRegisterId = 2,
                Amount = 50m
            };

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
        }

        [Fact]
        public async Task Handle_WithNonExistingDestinationRegister_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            CashRegister source = CashRegister.Create("Kasa A", 300m, CashRegisterStatus.Open, restaurantId: 5);
            SetId(source, 1);
            await uow.CashRegisterRepo.AddAsync(source);

            var handler = new TransferBetweenCashRegistersCommandHandler(uow, new FakeCurrentUserService { RestaurantId = 5 });
            var command = new TransferBetweenCashRegistersCommand
            {
                SourceCashRegisterId = 1,
                DestinationCashRegisterId = 99,
                Amount = 50m
            };

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }
}
