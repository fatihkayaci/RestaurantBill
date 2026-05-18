using Moq;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Application.Features.Orders.Commands.CreateOrder;
using AutoMapper;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Application.Tests.Orders;

public class CreateOrderCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly CreateOrderCommandHandler _handler;

    public CreateOrderCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _handler = new CreateOrderCommandHandler(_mockUow.Object, _mockMapper.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidRequest_ShouldCreateOrderAndOccupiedTable()
    {
        var tableId = 1;
        var command = new CreateOrderCommand { TableId = tableId };
        Table table = Table.Create("Masa 1", "", 1);
        var expectedDto = new OrderDto { TableId = tableId, Status = OrderStatus.Active };

        _mockUow.Setup(u => u.Table.GetByIdAsync(tableId, true))
                .ReturnsAsync(table);
        _mockUow.Setup(u => u.Order.AddAsync(It.IsAny<Order>())).Returns(Task.CompletedTask);
        _mockMapper.Setup(m => m.Map<OrderDto>(It.IsAny<Order>()))
               .Returns(expectedDto);

        var result = await _handler.Handle(command, CancellationToken.None);

        Assert.Equal(TableStatus.Occupied, table.Status);
        Assert.NotNull(result);
        Assert.Equal(expectedDto.TableId, result.TableId);

        _mockUow.Verify(u => u.Order.AddAsync(It.IsAny<Order>()), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region sad paths

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Handle_WhenTableIdIsZeroOrNegative_ShouldThrowNotFoundException(int invalidId)
    {
        var command = new CreateOrderCommand { TableId = invalidId };
        _mockUow.Setup(u => u.Table.GetByIdAsync(It.IsAny<int>(), It.IsAny<bool>()))
                .ReturnsAsync((Table?)null);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, default));
    }

    [Fact]
    public async Task Handle_WhenTableNotFound_ShouldThrowNotFoundException()
    {
        var tableId = 999;
        var command = new CreateOrderCommand { TableId = tableId };
        _mockUow.Setup(t => t.Table.GetByIdAsync(tableId, true))
        .ReturnsAsync((Table?)null);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
        _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Böyle bir Masa bulunamadı.", exception.Message);
    }

    [Theory]
    [InlineData(TableStatus.Occupied)]
    [InlineData(TableStatus.Reserved)]
    [InlineData(TableStatus.OutOfService)]
    public async Task Handle_WhenTableStatusNotAvailable_ShouldThrowDomainException(TableStatus status)
    {
        var tableId = 999;
        var command = new CreateOrderCommand { TableId = tableId };
        Table table = Table.Create("Masa 1", "", 1);
        table.SetStatus(status);

        _mockUow.Setup(u => u.Table.GetByIdAsync(tableId, true))
                .ReturnsAsync(table);

        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    #endregion
}
