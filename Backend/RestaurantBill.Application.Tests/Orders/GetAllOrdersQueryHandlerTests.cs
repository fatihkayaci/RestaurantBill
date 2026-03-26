using AutoMapper;
using Moq;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Orders.Queries.GetAllOrders;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Orders;

public class GetAllOrdersQueryHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly GetAllOrdersQueryHandler _handler;

    public GetAllOrdersQueryHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _handler = new GetAllOrdersQueryHandler(_mockUow.Object, _mockMapper.Object);
    }

    [Fact]
    public async Task Handle_WhenOrdersExist_ShouldReturnMappedList()
    {
        var orders = new List<Order> { new() { Id = 1 }, new() { Id = 2 } };
        var orderDtos = new List<OrderDto> { new() { Id = 1 }, new() { Id = 2 } };

        _mockUow.Setup(u => u.Order.GetAllAsync(null, false, "OrderItems,OrderItems.Product"))
                .ReturnsAsync(orders);

        _mockMapper.Setup(m => m.Map<List<OrderDto>>(orders))
                   .Returns(orderDtos);

        var result = await _handler.Handle(new GetAllOrdersQuery(), CancellationToken.None);

        Assert.Equal(2, result.Count);
        Assert.Equal(1, result[0].Id);
    }

    [Fact]
    public async Task Handle_WhenNoOrdersExist_ShouldReturnEmptyList()
    {
        _mockUow.Setup(u => u.Order.GetAllAsync(null, false, "OrderItems,OrderItems.Product"))
                .ReturnsAsync(new List<Order>());

        _mockMapper.Setup(m => m.Map<List<OrderDto>>(It.IsAny<List<Order>>()))
                   .Returns(new List<OrderDto>());

        var result = await _handler.Handle(new GetAllOrdersQuery(), CancellationToken.None);

        Assert.Empty(result);
    }
}
