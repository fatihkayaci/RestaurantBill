using Moq;
using RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using System.Linq.Expressions;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Orders.Commands.CloseOrder;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Orders;

public class CloseOrderCommandHandlerTests
{
    
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly CloseOrderCommandHandler _handler;

    public CloseOrderCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _handler = new CloseOrderCommandHandler(_mockUow.Object);
    }
    #region happy paths
    [Fact]
    public async Task Handle_WhenValidRequest_ShouldCloseOrderAndFreeTable()
    {
        var orderId = 1;
        var tableId = 1;
        var command = new CloseOrderCommand{ OrderId = orderId};
        
        var order = new Order {Id = orderId, TableId = tableId, Status = OrderStatus.Active};
        var table = new Table { Id = tableId, Status = TableStatus.Occupied };
        
        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true))
        .ReturnsAsync(order);
        
        _mockUow.Setup(u => u.Table.GetByIdAsync(tableId, true))
        .ReturnsAsync(table);

        await _handler.Handle(command, CancellationToken.None);

        Assert.Equal(OrderStatus.Paid, order.Status);
        Assert.Equal(TableStatus.Available, table.Status);
        
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
    #endregion
    
    #region sad paths
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Handle_WhenOrderIdIsInvalid_ShouldThrowBusinessException(int invalidId)
    {
        var command = new CloseOrderCommand { OrderId = invalidId };

        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, default));

        Assert.Equal("id 0 dan küçük veya eşit olamaz", exception.Message);
    }
    [Fact]
    public async Task Handle_WhenOrderNotFound_ShouldThrowException()
    {
        var command = new CloseOrderCommand { OrderId = 999 };
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
        var command = new CloseOrderCommand { OrderId = orderId };
        var order = new Order{Id = orderId, TableId = tableId};

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, true))
                .ReturnsAsync(order);

        _mockUow.Setup(u => u.Table.GetByIdAsync(tableId, true))
                .ReturnsAsync((Table?)null);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Böyle bir Masa bulunamadı.", exception.Message);
    }
    #endregion
}