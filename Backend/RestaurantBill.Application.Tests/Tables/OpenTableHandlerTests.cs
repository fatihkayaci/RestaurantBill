using Moq;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Tables.Commands.OpenTable;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Tables;

public class OpenTableHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly OpenTableHandler _handler;

    public OpenTableHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _handler = new OpenTableHandler(_mockUow.Object);
    }

    #region happy paths
    [Fact]
    public async Task Handle_WhenValidRequest_ShouldSetTableOccupiedAndCreateOrder()
    {
        var tableId = 1;
        var command = new OpenTableCommand { TableId = tableId };
        var table = new Table { Id = tableId, Status = TableStatus.Available };

        _mockUow.Setup(u => u.Table.GetByIdAsync(tableId, true))
                .ReturnsAsync(table);

        _mockUow.Setup(u => u.Order.AddAsync(It.IsAny<Order>())).Returns(Task.CompletedTask);

        await _handler.Handle(command, CancellationToken.None);

        Assert.Equal(TableStatus.Occupied, table.Status);
        _mockUow.Verify(u => u.Order.AddAsync(It.Is<Order>(o => o.TableId == tableId)), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
    #endregion

    #region sad paths
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Handle_WhenTableIdIsZeroOrNegative_ShouldThrowBusinessException(int invalidId)
    {
        var command = new OpenTableCommand { TableId = invalidId };

        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("id 0 dan küçük veya eşit olamaz", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenTableNotFound_ShouldThrowNotFoundException()
    {
        var command = new OpenTableCommand { TableId = 999 };

        _mockUow.Setup(u => u.Table.GetByIdAsync(999, true))
                .ReturnsAsync((Table?)null);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Böyle bir masa bulunamadı.", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenTableIsOccupied_ShouldThrowBusinessException()
    {
        var tableId = 1;
        var command = new OpenTableCommand { TableId = tableId };
        var table = new Table { Id = tableId, Status = TableStatus.Occupied };

        _mockUow.Setup(u => u.Table.GetByIdAsync(tableId, true))
                .ReturnsAsync(table);

        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Bu masa zaten dolu!", exception.Message);
    }
    #endregion
}
