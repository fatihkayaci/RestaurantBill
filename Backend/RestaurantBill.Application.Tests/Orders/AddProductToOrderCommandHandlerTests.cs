using Moq;
using RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using System.Linq.Expressions;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Exceptions;

namespace RestaurantBill.Application.Tests.Orders;

public class AddProductToOrderCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IOrderMessagePublisher> _mockPublisher;
    private readonly AddProductToOrderCommandHandler _handler;

    public AddProductToOrderCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockPublisher = new Mock<IOrderMessagePublisher>();
        _handler = new AddProductToOrderCommandHandler(_mockUow.Object, _mockPublisher.Object);
    }
    #region happy paths
    [Fact]
    public async Task Handle_WhenValidRequest_ShouldAddItemAndSaveChanges()
    {
        // --- ARRANGE ---
        var orderId = 1;
        var productId = 5;
        var command = new AddProductToOrderCommand 
        { 
            OrderId = orderId,
            OrderItems = new List<CreateOrderItemDto> { new() { ProductId = productId, Quantity = 2 } }
        };

        var order = new Order { Id = orderId, OrderItems = new List<OrderItem>(), TotalPrice = 0 };
        var product = new Product {  Id = productId, Name = "TestProduct", Price = 50 };

        _mockUow.Setup(u => u.Order.GetByIdAsync(
            orderId, 
            true, 
            It.IsAny<Expression<Func<Order, object>>[]>()))
                .ReturnsAsync(order);

        _mockUow.Setup(u => u.Product.GetByIdAsync(productId, false, It.IsAny<Expression<Func<Product, object>>[]>()))
                .ReturnsAsync(product);
            
        
        // --- ACT ---
        await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        Assert.Single(order.OrderItems); 
        Assert.Equal(100, order.TotalPrice);    

        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
    [Fact]
    public async Task Handle_WhenProductAlreadyInOrder_ShouldIncreaseQuantity()
    {
        var orderId = 1;
        var productId = 5;
        
        var order = new Order { 
            Id = orderId, 
            OrderItems = new List<OrderItem> { 
                new OrderItem { ProductId = productId, Quantity = 1, UnitPrice = 50 } 
            } 
        };

        var command = new AddProductToOrderCommand { 
            OrderId = orderId,
            OrderItems = new List<CreateOrderItemDto> { new() { ProductId = productId, Quantity = 2 } }
        };

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true, It.IsAny<Expression<Func<Order, object>>[]>()))
                .ReturnsAsync(order);
        
        _mockUow.Setup(u => u.Product.GetByIdAsync(productId, false))
                .ReturnsAsync(new Product {Name = "TestProduct", Id = productId, Price = 50 });

        await _handler.Handle(command, CancellationToken.None);
        var item = order.OrderItems.First(x => x.ProductId == productId);
        
        Assert.Equal(3, item.Quantity);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
    #endregion
    
    #region sad paths
    [Fact]
    public async Task Handle_WhenProductDoesNotExist_ShouldThrowException()
    {
        var command = new AddProductToOrderCommand 
        { 
            OrderId = 1,
            OrderItems = new List<CreateOrderItemDto> { new() { ProductId = 999, Quantity = 2 } }
        };
        var order = new Order { Id = 1, OrderItems = new List<OrderItem>(), TotalPrice = 0 };
        _mockUow.Setup(u => u.Order.GetByIdAsync(
            1, 
            true, 
            It.IsAny<Expression<Func<Order, object>>[]>()))
            .ReturnsAsync(order);
            
        _mockUow.Setup(u => u.Product.GetByIdAsync(999, false))
                    .ReturnsAsync((Product)null!);
        var exception = await Assert.ThrowsAsync<NotFoundException>(() => 
                        _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Böyle bir ürün bulunamadı.", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenOrderDoesNotExist_ShouldThrowException()
    {
        var command = new AddProductToOrderCommand { OrderId = 999 };
        
        _mockUow.Setup(u => u.Order.GetByIdAsync(
            command.OrderId, 
            It.IsAny<bool>(),//önemli olmadığı için It.IsAny kullanılır
            It.IsAny<Expression<Func<Order, object>>[]>()
        )).ReturnsAsync((Order)null!);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() => 
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Böyle bir sipariş bulunamadı.", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenQuantityIsZero_ShouldThrowException()
    {
        var commandWithZero = new AddProductToOrderCommand { 
            OrderId = 1,
            OrderItems = new List<CreateOrderItemDto> { new() { ProductId = 999, Quantity = 0 } }
        };

        var commandWithNegative = new AddProductToOrderCommand { 
            OrderId = 1,
            OrderItems = new List<CreateOrderItemDto> { new() { ProductId = 999, Quantity = -5 } }
        };
        var order = new Order { Id = 1, OrderItems = new List<OrderItem>() };
        _mockUow.Setup(u => u.Order.GetByIdAsync(1, true, It.IsAny<Expression<Func<Order, object>>[]>()))
                .ReturnsAsync(order);
        var exception1 = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(commandWithZero, CancellationToken.None));

        var exception2 = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(commandWithNegative, CancellationToken.None));

        Assert.Equal("Miktar 0'dan büyük olmalı!", exception1.Message);
        Assert.Equal("Miktar 0'dan büyük olmalı!", exception2.Message);
    }

    #endregion
}