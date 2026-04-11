using Moq;
using RestaurantBill.Application.Features.Orders.Commands.CancelOrder;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using System.Linq.Expressions;

namespace RestaurantBill.Application.Tests.Orders;

public class CancelOrderCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<ITableNotificationService> _mockNotificationService;
    private readonly CancelOrderCommandHandler _handler;

    public CancelOrderCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockNotificationService = new Mock<ITableNotificationService>();
        _handler = new CancelOrderCommandHandler(_mockUow.Object, _mockNotificationService.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidRequest_ShouldCancelOrderAndFreeTable()
    {
        // --- ARRANGE ---
        var orderId = 1;
        var tableId = 3;
        var command = new CancelOrderCommand { OrderId = orderId };

        var order = new Order { Id = orderId, TableId = tableId, Status = OrderStatus.Active };
        var table = new Table { Id = tableId, Status = TableStatus.Occupied };

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true))
                .ReturnsAsync(order);

        _mockUow.Setup(u => u.Table.GetByIdAsync(tableId, true))
                .ReturnsAsync(table);

        // --- ACT ---
        await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        Assert.Equal(OrderStatus.Cancelled, order.Status);
        Assert.Equal(TableStatus.Available, table.Status);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region sad paths

    
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Handle_WhenOrderIdIsZeroOrNegative_ShouldThrowBusinessException(int invalidId)
    {
        var commandWithZero = new CancelOrderCommand { OrderId = invalidId };

        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(commandWithZero, CancellationToken.None));
            
        Assert.Equal("id 0 dan küçük veya eşit olamaz", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenOrderNotFound_ShouldThrowException()
    {
        var command = new CancelOrderCommand { OrderId = 999 };

        _mockUow.Setup(u => u.Order.GetByIdAsync(999, true))
                .ReturnsAsync((Order?)null);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Böyle bir sipariş bulunamadı.", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenTableNotFound_ShouldThrowException()
    {
        var orderId = 1;
        var tableId = 99;
        var command = new CancelOrderCommand { OrderId = orderId };

        var order = new Order { Id = orderId, TableId = tableId };

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true))
                .ReturnsAsync(order);

        _mockUow.Setup(u => u.Table.GetByIdAsync(tableId, true))
                .ReturnsAsync((Table?)null);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Bu siparişe ait bir masa bulunamadı.", exception.Message);
    }

    #endregion
}
