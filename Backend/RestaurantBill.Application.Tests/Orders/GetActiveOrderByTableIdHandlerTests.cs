using AutoMapper;
using Moq;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Orders.Queries.GetActiveOrderByTableId;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Orders;

public class GetActiveOrderByTableIdHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly GetActiveOrderByTableIdHandler _handler;

    public GetActiveOrderByTableIdHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _handler = new GetActiveOrderByTableIdHandler(_mockUow.Object, _mockMapper.Object);
    }

    [Fact]
    public async Task Handle_WhenActiveOrderExists_ShouldReturnMappedDto()
    {
        var tableId = 1;
        var order = new Order { Id = 5, TableId = tableId };
        var orderDto = new OrderDto { Id = 5, TableId = tableId };

        _mockUow.Setup(u => u.Order.GetActiveOrderByTableId(tableId, false))
                .ReturnsAsync(order);

        _mockMapper.Setup(m => m.Map<OrderDto>(order))
                   .Returns(orderDto);

        var result = await _handler.Handle(new GetActiveOrderByTableIdQuery { TableId = tableId }, CancellationToken.None);

        Assert.Equal(5, result.Id);
        Assert.Equal(tableId, result.TableId);
    }

    [Fact]
    public async Task Handle_WhenNoActiveOrder_ShouldReturnNull()
    {
        var tableId = 1;

        _mockUow.Setup(u => u.Order.GetActiveOrderByTableId(tableId, false))
                .ReturnsAsync((Order?)null);

        _mockMapper.Setup(m => m.Map<OrderDto>(null))
                   .Returns((OrderDto?)null!);

        var result = await _handler.Handle(new GetActiveOrderByTableIdQuery { TableId = tableId }, CancellationToken.None);

        Assert.Null(result);
    }
}
