using RestaurantBill.Application.Features.CashRegisters.Commands.AddTransactionToCashRegister;
using RestaurantBill.Application.Features.CashRegisters.Commands.CreateCashRegister;
using RestaurantBill.Application.Features.CashRegisters.Commands.DeleteCashRegister;
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

            await handler.Handle(command, CancellationToken.None);

            Assert.Single(uow.CashRegisterRepo.Added);
            Assert.Equal("Ana Kasa", uow.CashRegisterRepo.Added[0].Name);
            Assert.Equal(1000m, uow.CashRegisterRepo.Added[0].Balance);
            Assert.Equal(5, uow.CashRegisterRepo.Added[0].RestaurantId);
            Assert.True(uow.SaveChangesCalled);
        }
    }

    public class UpdateCashRegisterHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingRegister_UpdatesAndSaves()
        {
            var uow = new FakeUnitOfWork();
            CashRegister existing = CashRegister.Create("Eski Ad", 500m, CashRegisterStatus.Open, restaurantId: 1);
            uow.CashRegisterRepo.Added.Contains(existing); // seed
            await uow.CashRegisterRepo.AddAsync(existing);

            var handler = new UpdateCashRegisterHandler(uow);
            var command = new UpdateCashRegisterCommand
            {
                Id = existing.Id,
                Name = "Yeni Ad",
                Balance = 750m,
                Status = CashRegisterStatus.Closed
            };

            await handler.Handle(command, CancellationToken.None);

            Assert.Equal("Yeni Ad", existing.Name);
            Assert.Equal(750m, existing.Balance);
            Assert.Equal(CashRegisterStatus.Closed, existing.Status);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithNonExistingRegister_ThrowsException()
        {
            var uow = new FakeUnitOfWork();
            var handler = new UpdateCashRegisterHandler(uow);
            var command = new UpdateCashRegisterCommand { Id = 99, Name = "Ad", Balance = 0m, Status = CashRegisterStatus.Open };

            await Assert.ThrowsAnyAsync<Exception>(() => handler.Handle(command, CancellationToken.None));
        }
    }

    public class DeleteCashRegisterHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingRegister_DeletesAndSaves()
        {
            var uow = new FakeUnitOfWork();
            CashRegister existing = CashRegister.Create("Kasa", 100m, CashRegisterStatus.Open, restaurantId: 1);
            await uow.CashRegisterRepo.AddAsync(existing);

            var handler = new DeleteCashRegisterHandler(uow);
            var command = new DeleteCashRegisterCommand { CashRegisterId = existing.Id };

            await handler.Handle(command, CancellationToken.None);

            Assert.Empty(uow.CashRegisterRepo.Added);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithNonExistingRegister_ThrowsException()
        {
            var uow = new FakeUnitOfWork();
            var handler = new DeleteCashRegisterHandler(uow);
            var command = new DeleteCashRegisterCommand { CashRegisterId = 99 };

            await Assert.ThrowsAnyAsync<Exception>(() => handler.Handle(command, CancellationToken.None));
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

            await handler.Handle(command, CancellationToken.None);

            Assert.Equal(700m, register.Balance);
            Assert.Single(uow.CashTransactionRepo.Added);
            Assert.True(uow.SaveChangesCalled);
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
}
