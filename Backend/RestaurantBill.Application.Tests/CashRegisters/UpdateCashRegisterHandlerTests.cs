using Moq;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.CashRegisters.Commands.Update;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.CashRegisters;

public class UpdateCashRegisterHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly UpdateCashRegisterHandler _handler;

    public UpdateCashRegisterHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _handler = new UpdateCashRegisterHandler(_mockUow.Object);
    }

    [Fact]
    public async Task Handle_WhenRegisterExists_ShouldUpdateAndSave()
    {
        var existing = new CashRegister
        {
            Id = 1,
            Name = "Old",
            Balance = 50m,
            Status = CashRegisterStatus.Open
        };

        _mockUow.Setup(u => u.CashRegister.GetByIdAsync(1, true)).ReturnsAsync(existing);

        var command = new UpdateCashRegisterCommand
        {
            Id = 1,
            Name = "New",
            Balance = 200m,
            Status = CashRegisterStatus.Closed
        };

        await _handler.Handle(command, CancellationToken.None);

        Assert.Equal("New", existing.Name);
        Assert.Equal(200m, existing.Balance);
        Assert.Equal(CashRegisterStatus.Closed, existing.Status);
        _mockUow.Verify(u => u.CashRegister.UpdateAsync(existing), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenRegisterNotFound_ShouldThrowNotFoundException()
    {
        _mockUow.Setup(u => u.CashRegister.GetByIdAsync(999, true)).ReturnsAsync((CashRegister?)null);

        var command = new UpdateCashRegisterCommand { Id = 999, Name = "X" };

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }
}
