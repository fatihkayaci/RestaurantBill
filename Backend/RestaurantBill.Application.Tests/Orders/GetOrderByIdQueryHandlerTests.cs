using AutoMapper;
using Moq;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Orders.Queries.GetOrderById;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Orders;

public class GetOrderByIdQueryHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly GetOrderByIdQueryHandler _handler;

    public GetOrderByIdQueryHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _handler = new GetOrderByIdQueryHandler(_mockUow.Object, _mockMapper.Object);
    }

    [Fact]
    public async Task Handle_WhenOrderExists_ShouldReturnMappedDto()
    {
        var orderId = 1;
        var order = new Order { Id = orderId };
        var orderDto = new OrderDto { Id = orderId };

        _mockUow.Setup(u => u.Order.GetByIdAsync(orderId, false))
                .ReturnsAsync(order);

        _mockMapper.Setup(m => m.Map<OrderDto>(order))
                   .Returns(orderDto);

        var result = await _handler.Handle(new GetOrderByIdQuery { OrderId = orderId }, CancellationToken.None);

        Assert.Equal(orderId, result.Id);
    }

    [Fact]
    public async Task Handle_WhenOrderNotFound_ShouldThrowNotFoundException()
    {
        _mockUow.Setup(u => u.Order.GetByIdAsync(999, false))
                .ReturnsAsync((Order?)null);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(new GetOrderByIdQuery { OrderId = 999 }, CancellationToken.None));

        Assert.Equal("Sipariş bulunamadı.", exception.Message);
    }
}
