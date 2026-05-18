using Moq;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Orders.Commands.CloseOrder;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Orders;

public class CloseOrderCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<ITableNotificationService> _mockNotificationService;
    private readonly CloseOrderCommandHandler _handler;

    public CloseOrderCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockNotificationService = new Mock<ITableNotificationService>();
        _mockNotificationService
            .Setup(s => s.SendTableStatusChangedAsync(It.IsAny<int>(), It.IsAny<int>()))
            .Returns(Task.CompletedTask);
        _mockNotificationService
            .Setup(s => s.SendOrderClosedAsync(It.IsAny<int>(), It.IsAny<int>()))
            .Returns(Task.CompletedTask);
        _handler = new CloseOrderCommandHandler(_mockUow.Object, _mockNotificationService.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidRequest_ShouldCloseOrderAndFreeTable()
    {
        var orderId = 1;
        var tableId = 1;
        var command = new DeleteCommand { OrderId = orderId };

        Order order = Order.Create(tableId);
        Table table = Table.Create("Masa 1", "", 1);
        table.Occupy();

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true))
        .ReturnsAsync(order);

        _mockUow.Setup(u => u.Table.GetByIdAsync(order.TableId, true))
        .ReturnsAsync(table);

        await _handler.Handle(command, CancellationToken.None);

        Assert.Equal(OrderStatus.Paid, order.Status);
        Assert.Equal(TableStatus.Available, table.Status);

        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region sad paths

    [Fact]
    public async Task Handle_WhenOrderNotFound_ShouldThrowException()
    {
        var command = new DeleteCommand { OrderId = 999 };
        _mockUow.Setup(o => o.Order.GetByIdAsync(999, true))
        .ReturnsAsync((Order?)null);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
        _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Böyle bir sipariş bulunamadı.", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenTableNotFound_ShouldThrowException()
    {
        var orderId = 999;
        var tableId = 99;
        var command = new DeleteCommand { OrderId = orderId };
        Order order = Order.Create(tableId);

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true))
                .ReturnsAsync(order);

        _mockUow.Setup(u => u.Table.GetByIdAsync(order.TableId, true))
                .ReturnsAsync((Table?)null);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Böyle bir Masa bulunamadı.", exception.Message);
    }

    #endregion
}
