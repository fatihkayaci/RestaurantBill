using Moq;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Tables.Commands.CancelReservation;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Tables;

public class CancelReservationHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly CancelReservationHandler _handler;

    public CancelReservationHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _handler = new CancelReservationHandler(_mockUow.Object);
    }

    #region happy paths
    [Fact]
    public async Task Handle_WhenValidRequest_ShouldSetTableToAvailable()
    {
        var tableId = 1;
        var command = new CancelReservationCommand { TableId = tableId };
        var table = new Table { Id = tableId, Status = TableStatus.Reserved };

        _mockUow.Setup(u => u.Table.GetByIdAsync(tableId, true))
                .ReturnsAsync(table);

        await _handler.Handle(command, CancellationToken.None);

        Assert.Equal(TableStatus.Available, table.Status);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
    #endregion

    #region sad paths
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Handle_WhenTableIdIsZeroOrNegative_ShouldThrowBusinessException(int invalidId)
    {
        var command = new CancelReservationCommand { TableId = invalidId };

        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("id 0 dan küçük veya eşit olamaz", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenTableNotFound_ShouldThrowNotFoundException()
    {
        var command = new CancelReservationCommand { TableId = 999 };

        _mockUow.Setup(u => u.Table.GetByIdAsync(999, true))
                .ReturnsAsync((Table?)null);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Böyle bir masa bulunamadı.", exception.Message);
    }
    #endregion
}
