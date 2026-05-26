using Moq;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Application.Features.Orders.Commands.RemoveProductFromOrder;
using System.Linq.Expressions;

namespace RestaurantBill.Application.Tests.Orders;

public class RemoveProductFromOrderHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly RemoveProductFromOrderCommandHandler _handler;

    public RemoveProductFromOrderHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _handler = new RemoveProductFromOrderCommandHandler(_mockUow.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidRequest_ShouldRemoveItemAndRecalculateTotalPrice()
    {
        var orderId = 1;
        var command = new RemoveProductFromOrderCommand { OrderId = orderId, ProductId = 0 };

        Order order = Order.Create(1);
        Product product = Product.Create("Remove Me", 100m, true, "", 1, 1);
        // Product.Id defaults to 0 since it is protected set; AddItem stores ProductId = product.Id = 0
        order.AddItem(product, 2);

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true, It.IsAny<Expression<Func<Order, object>>>()))
                .ReturnsAsync(order);

        await _handler.Handle(command, CancellationToken.None);

        Assert.Empty(order.OrderItems);
        Assert.Equal(0, order.TotalPrice);

        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region sad paths

    [Fact]
    public async Task Handle_WhenOrderNotFound_ShouldThrowNotFoundException()
    {
        var orderId = 999;
        var command = new RemoveProductFromOrderCommand { OrderId = orderId };
        _mockUow.Setup(o => o.Order.GetByIdAsync(999, true, It.IsAny<Expression<Func<Order, object>>>()))
        .ReturnsAsync((Order?)null);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
        _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Böyle bir sipariş bulunamadı.", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenProductNotFound_ShouldThrowException()
    {
        var orderId = 1;
        var productId = 999;
        var command = new RemoveProductFromOrderCommand { OrderId = orderId, ProductId = productId };

        Order order = Order.Create(1);

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true, It.IsAny<Expression<Func<Order, object>>>()))
            .ReturnsAsync(order);

        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    #endregion
}
