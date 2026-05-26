using Moq;
using RestaurantBill.Application.Features.Orders.Commands.CancelOrder;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

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
        _mockNotificationService
            .Setup(s => s.SendTableStatusChangedAsync(It.IsAny<int>(), It.IsAny<int>()))
            .Returns(Task.CompletedTask);
        _mockNotificationService
            .Setup(s => s.SendOrderClosedAsync(It.IsAny<int>(), It.IsAny<int>()))
            .Returns(Task.CompletedTask);
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

        Order order = Order.Create(tableId);
        Table table = Table.Create("Masa 3", "", 1);
        table.Occupy();

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true))
                .ReturnsAsync(order);

        _mockUow.Setup(u => u.Table.GetByIdAsync(order.TableId, true))
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

        Order order = Order.Create(tableId);

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true))
                .ReturnsAsync(order);

        _mockUow.Setup(u => u.Table.GetByIdAsync(order.TableId, true))
                .ReturnsAsync((Table?)null);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Bu siparişe ait bir masa bulunamadı.", exception.Message);
    }

    #endregion
}
