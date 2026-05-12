using Moq;
using RestaurantBill.Application.Features.CashRegisters.Commands.Create;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.CashRegisters;

public class CreateCashRegisterHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<ICurrentUserService> _mockCurrentUser;
    private readonly CreateCashRegisterHandler _handler;

    public CreateCashRegisterHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockCurrentUser = new Mock<ICurrentUserService>();
        _mockCurrentUser.Setup(s => s.RestaurantId).Returns(7);
        _handler = new CreateCashRegisterHandler(_mockUow.Object, _mockCurrentUser.Object);
    }

    [Fact]
    public async Task Handle_WhenValidRequest_ShouldAddCashRegisterAndSaveChanges()
    {
        var command = new CreateCashRegisterCommand
        {
            Name = "Cash",
            OpeningBalance = 100m,
            Status = CashRegisterStatus.Open
        };

        _mockUow.Setup(u => u.CashRegister.AddAsync(It.IsAny<CashRegister>())).Returns(Task.CompletedTask);

        await _handler.Handle(command, CancellationToken.None);

        _mockUow.Verify(u => u.CashRegister.AddAsync(It.Is<CashRegister>(r =>
            r.Name == "Cash" &&
            r.Balance == 100m &&
            r.Status == CashRegisterStatus.Open &&
            r.RestaurantId == 7)), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
