using Microsoft.AspNetCore.Http;
using Moq;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.CashRegisters.Commands.AddTransaction;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using System.Security.Claims;

namespace RestaurantBill.Application.Tests.CashRegisters;

public class AddCashTransactionHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly AddCashTransactionHandler _handler;

    public AddCashTransactionHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork> { DefaultValue = DefaultValue.Mock };
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        _handler = new AddCashTransactionHandler(_mockUow.Object, _mockHttpContextAccessor.Object);
    }

    private void SetupHttpContext(string userId)
    {
        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, userId) };
        var identity = new ClaimsIdentity(claims);
        var principal = new ClaimsPrincipal(identity);
        var httpContext = new DefaultHttpContext { User = principal };
        _mockHttpContextAccessor.Setup(a => a.HttpContext).Returns(httpContext);
    }

    [Fact]
    public async Task Handle_WhenInTransaction_ShouldIncreaseBalanceAndPersist()
    {
        SetupHttpContext("5");
        var register = new CashRegister
        {
            Id = 1,
            Balance = 100m,
            Status = CashRegisterStatus.Open
        };
        _mockUow.Setup(u => u.CashRegister.GetByIdAsync(1, true)).ReturnsAsync(register);

        var command = new AddCashTransactionCommand
        {
            CashRegisterId = 1,
            Type = CashTransactionType.In,
            Amount = 50m
        };

        await _handler.Handle(command, CancellationToken.None);

        Assert.Equal(150m, register.Balance);
        _mockUow.Verify(u => u.CashTransaction.AddAsync(It.Is<CashTransaction>(t =>
            t.CashRegisterId == 1 &&
            t.Type == CashTransactionType.In &&
            t.Amount == 50m &&
            t.UserId == 5)), Times.Once);
        _mockUow.Verify(u => u.CashRegister.UpdateAsync(register), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenOutTransaction_ShouldDecreaseBalance()
    {
        SetupHttpContext("5");
        var register = new CashRegister
        {
            Id = 1,
            Balance = 100m,
            Status = CashRegisterStatus.Open
        };
        _mockUow.Setup(u => u.CashRegister.GetByIdAsync(1, true)).ReturnsAsync(register);

        var command = new AddCashTransactionCommand
        {
            CashRegisterId = 1,
            Type = CashTransactionType.Out,
            Amount = 30m
        };

        await _handler.Handle(command, CancellationToken.None);

        Assert.Equal(70m, register.Balance);
    }

    [Fact]
    public async Task Handle_WhenRegisterClosed_ShouldThrowBusinessException()
    {
        SetupHttpContext("5");
        var register = new CashRegister
        {
            Id = 1,
            Balance = 100m,
            Status = CashRegisterStatus.Closed
        };
        _mockUow.Setup(u => u.CashRegister.GetByIdAsync(1, true)).ReturnsAsync(register);

        var command = new AddCashTransactionCommand
        {
            CashRegisterId = 1,
            Type = CashTransactionType.In,
            Amount = 50m
        };

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Kapalı bir kasaya işlem eklenemez.", ex.Message);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenInsufficientBalanceForOut_ShouldThrowBusinessException()
    {
        SetupHttpContext("5");
        var register = new CashRegister
        {
            Id = 1,
            Balance = 20m,
            Status = CashRegisterStatus.Open
        };
        _mockUow.Setup(u => u.CashRegister.GetByIdAsync(1, true)).ReturnsAsync(register);

        var command = new AddCashTransactionCommand
        {
            CashRegisterId = 1,
            Type = CashTransactionType.Out,
            Amount = 50m
        };

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Kasa bakiyesi bu çıkışı karşılamak için yetersiz.", ex.Message);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenRegisterNotFound_ShouldThrowNotFoundException()
    {
        SetupHttpContext("5");
        _mockUow.Setup(u => u.CashRegister.GetByIdAsync(999, true)).ReturnsAsync((CashRegister?)null);

        var command = new AddCashTransactionCommand
        {
            CashRegisterId = 999,
            Type = CashTransactionType.In,
            Amount = 10m
        };

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }
}
