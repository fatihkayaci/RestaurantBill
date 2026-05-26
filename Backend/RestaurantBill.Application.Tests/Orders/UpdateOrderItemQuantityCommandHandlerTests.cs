using Moq;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemQuantity;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
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
        // ProductId defaults to 0 since Product.Id is protected set
        var command = new UpdateOrderItemQuantityCommand { OrderId = orderId, ProductId = 0, Quantity = 5 };

        Order order = Order.Create(1);
        Product product = Product.Create("Test", 20m, true, "", 1, 1);
        order.AddItem(product, 1);

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true, It.IsAny<Expression<Func<Order, object>>[]>()))
                .ReturnsAsync(order);

        // Act
        await _handler.Handle(command, CancellationToken.None);

        // Assert
        var item = order.OrderItems.First();
        Assert.Equal(5, item.Quantity);
        Assert.Equal(100, order.TotalPrice); // 5 * 20
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region sad paths

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Handle_WhenQuantityIsZeroOrNegative_ShouldThrowDomainException(int invalidQuantity)
    {
        var orderId = 1;
        var command = new UpdateOrderItemQuantityCommand { OrderId = orderId, ProductId = 0, Quantity = invalidQuantity };

        Order order = Order.Create(1);
        Product product = Product.Create("Test", 20m, true, "", 1, 1);
        order.AddItem(product, 1);

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true, It.IsAny<Expression<Func<Order, object>>[]>()))
                .ReturnsAsync(order);

        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
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
    public async Task Handle_WhenProductNotInOrder_ShouldThrowDomainException()
    {
        var orderId = 1;
        var command = new UpdateOrderItemQuantityCommand { OrderId = orderId, ProductId = 999, Quantity = 2 };

        Order order = Order.Create(1);

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true, It.IsAny<Expression<Func<Order, object>>[]>()))
                .ReturnsAsync(order);

        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    [Theory]
    [InlineData(OrderItemStatus.Preparing)]
    [InlineData(OrderItemStatus.Ready)]
    [InlineData(OrderItemStatus.Delivered)]
    public async Task Handle_WhenItemStatusIsNotPending_ShouldThrowDomainException(OrderItemStatus status)
    {
        var orderId = 1;
        var command = new UpdateOrderItemQuantityCommand { OrderId = orderId, ProductId = 0, Quantity = 3 };

        Order order = Order.Create(1);
        Product product = Product.Create("Test", 20m, true, "", 1, 1);
        order.AddItem(product, 1);
        // Force status to non-pending via UpdateItemStatus (using orderId=0 for first item)
        var item = order.OrderItems.First();
        item.UpdateStatus(status);

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true, It.IsAny<Expression<Func<Order, object>>[]>()))
                .ReturnsAsync(order);

        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    #endregion
}
