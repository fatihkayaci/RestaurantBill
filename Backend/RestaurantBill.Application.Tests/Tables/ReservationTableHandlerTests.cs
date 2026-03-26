using Moq;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Tables.Commands.ReservationTable;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Tables;

public class ReservationTableHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMessageProducer> _mockMessageProducer;
    private readonly ReservationTableHandler _handler;

    public ReservationTableHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMessageProducer = new Mock<IMessageProducer>();
        _handler = new ReservationTableHandler(_mockUow.Object, _mockMessageProducer.Object);
    }

    #region happy paths
    [Fact]
    public async Task Handle_WhenValidRequest_ShouldSetTableToReserved()
    {
        var tableId = 1;
        var command = new ReservationTableCommand { TableId = tableId };
        var table = new Table { Id = tableId, Status = TableStatus.Available };

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
    public async Task Handle_WhenTableIdIsZeroOrNegative_ShouldThrowBusinessException(int invalidId)
    {
        var command = new ReservationTableCommand { TableId = invalidId };

        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("id 0 dan küçük veya eşit olamaz", exception.Message);
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
