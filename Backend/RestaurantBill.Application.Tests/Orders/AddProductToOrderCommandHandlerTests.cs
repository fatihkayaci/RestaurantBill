using MediatR;
using Moq;
using RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using System.Linq.Expressions;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Application.Tests.Orders;

public class AddProductToOrderCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMediator> _mockMediator;
    private readonly AddProductToOrderCommandHandler _handler;

    public AddProductToOrderCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMediator = new Mock<IMediator>();
        _handler = new AddProductToOrderCommandHandler(_mockUow.Object, _mockMediator.Object);
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

        Order order = Order.Create(1);
        Product product = Product.Create("TestProduct", 50m, true, "", 1, 1);

        _mockUow.Setup(u => u.Order.GetByIdAsync(
            orderId,
            true,
            It.IsAny<Expression<Func<Order, object>>[]>()))
                .ReturnsAsync(order);

        _mockUow.Setup(u => u.Product.GetByIdAsync(
                It.IsAny<int>(),
                It.IsAny<bool>(),
                It.IsAny<Expression<Func<Product, object>>[]>()))
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
        // Product.Id defaults to 0 (protected set); use 0 for ProductId matching
        var productId = 0;

        Order order = Order.Create(1);
        Product product = Product.Create("TestProduct", 50m, true, "", 1, 1);
        // Pre-populate one item; item.ProductId = product.Id = 0
        order.AddItem(product, 1);

        var command = new AddProductToOrderCommand
        {
            OrderId = orderId,
            OrderItems = new List<CreateOrderItemDto> { new() { ProductId = productId, Quantity = 2 } }
        };

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true, It.IsAny<Expression<Func<Order, object>>[]>()))
                .ReturnsAsync(order);

        _mockUow.Setup(u => u.Product.GetByIdAsync(
                It.IsAny<int>(),
                It.IsAny<bool>(),
                It.IsAny<Expression<Func<Product, object>>[]>()))
                .ReturnsAsync(product);

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
        Order order = Order.Create(1);
        _mockUow.Setup(u => u.Order.GetByIdAsync(
            1,
            true,
            It.IsAny<Expression<Func<Order, object>>[]>()))
            .ReturnsAsync(order);

        _mockUow.Setup(u => u.Product.GetByIdAsync(
                It.IsAny<int>(),
                It.IsAny<bool>(),
                It.IsAny<Expression<Func<Product, object>>[]>()))
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
            It.IsAny<bool>(),
            It.IsAny<Expression<Func<Order, object>>[]>()
        )).ReturnsAsync((Order)null!);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Böyle bir sipariş bulunamadı.", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenQuantityIsZero_ShouldThrowDomainException()
    {
        var commandWithZero = new AddProductToOrderCommand
        {
            OrderId = 1,
            OrderItems = new List<CreateOrderItemDto> { new() { ProductId = 0, Quantity = 0 } }
        };

        var commandWithNegative = new AddProductToOrderCommand
        {
            OrderId = 1,
            OrderItems = new List<CreateOrderItemDto> { new() { ProductId = 0, Quantity = -5 } }
        };
        Order order = Order.Create(1);
        Product product = Product.Create("Test", 10m, true, "", 1, 1);
        _mockUow.Setup(u => u.Order.GetByIdAsync(1, true, It.IsAny<Expression<Func<Order, object>>[]>()))
                .ReturnsAsync(order);
        _mockUow.Setup(u => u.Product.GetByIdAsync(
                It.IsAny<int>(),
                It.IsAny<bool>(),
                It.IsAny<Expression<Func<Product, object>>[]>()))
                .ReturnsAsync(product);

        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(commandWithZero, CancellationToken.None));

        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(commandWithNegative, CancellationToken.None));
    }

    #endregion
}
