using Moq;
using RestaurantBill.Application.Features.Tables.Commands.CreateTable;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Tables;

public class CreateTableHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<ICurrentUserService> _mockCurrentUser;
    private readonly CreateTableCommandHandler _handler;

    public CreateTableHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockCurrentUser = new Mock<ICurrentUserService>();
        _mockCurrentUser.Setup(s => s.RestaurantId).Returns(1);
        _handler = new CreateTableCommandHandler(_mockUow.Object, _mockCurrentUser.Object);
    }

    #region happy paths
    [Fact]
    public async Task Handle_WhenValidRequest_ShouldAddTableAndSaveChanges()
    {
        var command = new CreateTableCommand { Name = "Masa 1" };

        _mockUow.Setup(u => u.Table.AddAsync(It.IsAny<Table>())).Returns(Task.CompletedTask);

        await _handler.Handle(command, CancellationToken.None);

        _mockUow.Verify(u => u.Table.AddAsync(It.Is<Table>(t => t.Name == "Masa 1")), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
    #endregion
}
