using Moq;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemQuantity;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using System.Linq.Expressions;

namespace RestaurantBill.Application.Tests.Orders;

public class UpdateOrderItemQuantityCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly UpdateOrderItemQuantityCommandHandler _handler;

    public UpdateOrderItemQuantityCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _handler = new UpdateOrderItemQuantityCommandHandler(_mockUow.Object);
    }

    #region happy paths
    [Fact]
    public async Task Handle_WhenValidRequest_ShouldUpdateQuantityAndRecalculateTotal()
    {
        // Arrange
        var orderId = 1;
        var productId = 10;
        var command = new UpdateOrderItemQuantityCommand { OrderId = orderId, ProductId = productId, Quantity = 5 };

        var item = new OrderItem { ProductId = productId, Quantity = 1, UnitPrice = 20, Status = OrderItemStatus.Pending };
        var order = new Order { Id = orderId, OrderItems = new List<OrderItem> { item }, TotalPrice = 20 };

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true, It.IsAny<Expression<Func<Order, object>>[]>()))
                .ReturnsAsync(order);

        // Act
        await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.Equal(5, item.Quantity);
        Assert.Equal(100, order.TotalPrice); // 5 * 20
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
    #endregion

    #region sad paths
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Handle_WhenQuantityIsZeroOrNegative_ShouldThrowBusinessException(int invalidQuantity)
    {
        var command = new UpdateOrderItemQuantityCommand { OrderId = 1, ProductId = 1, Quantity = invalidQuantity };

        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Miktar 0'dan büyük olmalı!", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenOrderNotFound_ShouldThrowNotFoundException()
    {
        var command = new UpdateOrderItemQuantityCommand { OrderId = 999, ProductId = 1, Quantity = 2 };

        _mockUow.Setup(u => u.Order.GetByIdAsync(999, true, It.IsAny<Expression<Func<Order, object>>[]>()))
                .ReturnsAsync((Order?)null);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Böyle bir sipariş bulunamadı.", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenProductNotInOrder_ShouldThrowNotFoundException()
    {
        var orderId = 1;
        var command = new UpdateOrderItemQuantityCommand { OrderId = orderId, ProductId = 999, Quantity = 2 };

        var order = new Order { Id = orderId, OrderItems = new List<OrderItem>() };

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true, It.IsAny<Expression<Func<Order, object>>[]>()))
                .ReturnsAsync(order);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("İptal etmek istediğiniz ürün zaten bu siparişte yok!", exception.Message);
    }

    [Theory]
    [InlineData(OrderItemStatus.Preparing)]
    [InlineData(OrderItemStatus.Ready)]
    [InlineData(OrderItemStatus.Delivered)]
    public async Task Handle_WhenItemStatusIsNotPending_ShouldThrowBusinessException(OrderItemStatus status)
    {
        var orderId = 1;
        var productId = 10;
        var command = new UpdateOrderItemQuantityCommand { OrderId = orderId, ProductId = productId, Quantity = 3 };

        var item = new OrderItem { ProductId = productId, Quantity = 1, UnitPrice = 20, Status = status };
        var order = new Order { Id = orderId, OrderItems = new List<OrderItem> { item } };

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true, It.IsAny<Expression<Func<Order, object>>[]>()))
                .ReturnsAsync(order);

        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Sadece Garson onay kısmında güncellenebilir.", exception.Message);
    }
    #endregion
}
