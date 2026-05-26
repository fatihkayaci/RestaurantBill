using Moq;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Application.Features.Tables.Commands.ReservationTable;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Tables;

public class ReservationTableHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<ITableNotificationService> _mockNotificationService;
    private readonly ReservationTableCommandHandler _handler;

    public ReservationTableHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockNotificationService = new Mock<ITableNotificationService>();
        _handler = new ReservationTableCommandHandler(_mockUow.Object, _mockNotificationService.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidRequest_ShouldSetTableToReserved()
    {
        var tableId = 1;
        var command = new ReservationTableCommand { TableId = tableId };
        Table table = Table.Create("Masa 1", "", 1);

        _mockUow.Setup(u => u.Table.GetByIdAsync(tableId, true))
                .ReturnsAsync(table);

        await _handler.Handle(command, CancellationToken.None);

        Assert.Equal(TableStatus.Reserved, table.Status);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region sad paths

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Handle_WhenTableIdIsZeroOrNegative_ShouldThrowNotFoundException(int invalidId)
    {
        var command = new ReservationTableCommand { TableId = invalidId };
        _mockUow.Setup(u => u.Table.GetByIdAsync(It.IsAny<int>(), It.IsAny<bool>()))
                .ReturnsAsync((Table?)null);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_WhenTableNotFound_ShouldThrowNotFoundException()
    {
        var command = new ReservationTableCommand { TableId = 999 };

        _mockUow.Setup(u => u.Table.GetByIdAsync(999, true))
                .ReturnsAsync((Table?)null);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Böyle bir masa bulunamadı.", exception.Message);
    }

    #endregion
}
