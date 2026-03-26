using Moq;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Orders.Commands.CloseOrder;
using RestaurantBill.Domain.Enums;
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
        var productIdToRemove = 5;
        var command = new RemoveProductFromOrderCommand { OrderId = orderId, ProductId = productIdToRemove };

        var itemToRemove = new OrderItem { ProductId = productIdToRemove, UnitPrice = 100, Quantity = 2 };
        var itemToKeep = new OrderItem { ProductId = 10, UnitPrice = 50, Quantity = 1 };
        
        var order = new Order 
        { 
            Id = orderId, 
            OrderItems = new List<OrderItem> { itemToRemove, itemToKeep },
            TotalPrice = 250 
        };

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true, It.IsAny<Expression<Func<Order, object>>>()))
                .ReturnsAsync(order);

        await _handler.Handle(command, CancellationToken.None);

        Assert.Single(order.OrderItems);
        Assert.DoesNotContain(order.OrderItems, x => x.ProductId == productIdToRemove);
        Assert.Equal(50, order.TotalPrice);

        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
    #endregion
    #region sad paths
    [Fact]
    public async Task Handle_WhenOrderNotFound_ShouldThrowNotFoundException()
    {
        var orderId = 999;
        var command = new RemoveProductFromOrderCommand { OrderId = orderId};
        _mockUow.Setup(o => o.Order.GetByIdAsync(999, true))
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
        
        var order = new Order 
        { 
            Id = orderId, 
            OrderItems = new List<OrderItem>()
        };

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true, It.IsAny<Expression<Func<Order, object>>>()))
            .ReturnsAsync(order);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("İptal etmek istediğiniz ürün zaten bu siparişte yok!", exception.Message);
    }
    #endregion
}