using Moq;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.CashRegisters.Commands.DeleteCashRegister;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.CashRegisters;

public class DeleteCashRegisterHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly DeleteCashRegisterHandler _handler;

    public DeleteCashRegisterHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _handler = new DeleteCashRegisterHandler(_mockUow.Object);
    }

    [Fact]
    public async Task Handle_WhenRegisterExists_ShouldDeleteAndSave()
    {
        var register = new CashRegister { Id = 1, Name = "Cash" };
        _mockUow.Setup(u => u.CashRegister.GetByIdAsync(1, true)).ReturnsAsync(register);

        await _handler.Handle(new DeleteCashRegisterCommand { CashRegisterId = 1 }, CancellationToken.None);

        _mockUow.Verify(u => u.CashRegister.Delete(register), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenRegisterNotFound_ShouldThrowNotFoundException()
    {
        _mockUow.Setup(u => u.CashRegister.GetByIdAsync(999, true)).ReturnsAsync((CashRegister?)null);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(new DeleteCashRegisterCommand { CashRegisterId = 999 }, CancellationToken.None));

        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }
}
