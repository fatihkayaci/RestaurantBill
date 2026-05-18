using Moq;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.CashRegisters.Commands.AddTransactionToCashRegister;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.CashRegisters;

public class AddCashTransactionHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<ICurrentUserService> _mockCurrentUser;
    private readonly AddTransactionToCashRegisterCommandHandler _handler;

    public AddCashTransactionHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork> { DefaultValue = DefaultValue.Mock };
        _mockCurrentUser = new Mock<ICurrentUserService>();
        _mockCurrentUser.Setup(u => u.UserId).Returns("guid-005");
        _handler = new AddTransactionToCashRegisterCommandHandler(_mockUow.Object, _mockCurrentUser.Object);
    }

    [Fact]
    public async Task Handle_WhenInTransaction_ShouldIncreaseBalanceAndPersist()
    {
        CashRegister register = CashRegister.Create("Cash", 100m, CashRegisterStatus.Open, 1);
        _mockUow.Setup(u => u.CashRegister.GetByIdAsync(1, true)).ReturnsAsync(register);

        var command = new AddTransactionToCashRegisterCommand
        {
            CashRegisterId = 1,
            Type = CashTransactionType.In,
            Amount = 50m
        };

        await _handler.Handle(command, CancellationToken.None);

        Assert.Equal(150m, register.Balance);
        _mockUow.Verify(u => u.CashTransaction.AddAsync(It.Is<CashTransaction>(t =>
            t.CashRegisterId == register.Id &&
            t.Type == CashTransactionType.In &&
            t.Amount == 50m &&
            t.UserId == "guid-005")), Times.Once);
        _mockUow.Verify(u => u.CashRegister.UpdateAsync(register), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenOutTransaction_ShouldDecreaseBalance()
    {
        CashRegister register = CashRegister.Create("Cash", 100m, CashRegisterStatus.Open, 1);
        _mockUow.Setup(u => u.CashRegister.GetByIdAsync(1, true)).ReturnsAsync(register);

        var command = new AddTransactionToCashRegisterCommand
        {
            CashRegisterId = 1,
            Type = CashTransactionType.Out,
            Amount = 30m
        };

        await _handler.Handle(command, CancellationToken.None);

        Assert.Equal(70m, register.Balance);
    }

    [Fact]
    public async Task Handle_WhenRegisterClosed_ShouldThrowDomainException()
    {
        CashRegister register = CashRegister.Create("Cash", 100m, CashRegisterStatus.Closed, 1);
        _mockUow.Setup(u => u.CashRegister.GetByIdAsync(1, true)).ReturnsAsync(register);

        var command = new AddTransactionToCashRegisterCommand
        {
            CashRegisterId = 1,
            Type = CashTransactionType.In,
            Amount = 50m
        };

        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Kapalı bir kasaya işlem eklenemez.", ex.Message);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenInsufficientBalanceForOut_ShouldThrowDomainException()
    {
        CashRegister register = CashRegister.Create("Cash", 20m, CashRegisterStatus.Open, 1);
        _mockUow.Setup(u => u.CashRegister.GetByIdAsync(1, true)).ReturnsAsync(register);

        var command = new AddTransactionToCashRegisterCommand
        {
            CashRegisterId = 1,
            Type = CashTransactionType.Out,
            Amount = 50m
        };

        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Kasa bakiyesi bu çıkışı karşılamak için yetersiz.", ex.Message);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenRegisterNotFound_ShouldThrowNotFoundException()
    {
        _mockUow.Setup(u => u.CashRegister.GetByIdAsync(999, true)).ReturnsAsync((CashRegister?)null);

        var command = new AddTransactionToCashRegisterCommand
        {
            CashRegisterId = 999,
            Type = CashTransactionType.In,
            Amount = 10m
        };

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }
}
