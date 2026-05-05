using Microsoft.AspNetCore.Http;
using Moq;
using RestaurantBill.Application.Features.CashRegisters.Commands.Create;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using System.Security.Claims;

namespace RestaurantBill.Application.Tests.CashRegisters;

public class CreateCashRegisterHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly CreateCashRegisterHandler _handler;

    public CreateCashRegisterHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        _handler = new CreateCashRegisterHandler(_mockUow.Object, _mockHttpContextAccessor.Object);
    }

    private void SetupHttpContext(string restaurantId)
    {
        var claims = new List<Claim> { new("RestaurantId", restaurantId) };
        var identity = new ClaimsIdentity(claims);
        var principal = new ClaimsPrincipal(identity);
        var httpContext = new DefaultHttpContext { User = principal };
        _mockHttpContextAccessor.Setup(a => a.HttpContext).Returns(httpContext);
    }

    [Fact]
    public async Task Handle_WhenValidRequest_ShouldAddCashRegisterAndSaveChanges()
    {
        SetupHttpContext("7");
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
