using AutoMapper;
using Moq;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Tables.Queries.GetTableById;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Tables;

public class GetTableByIdHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly GetTableByIdHandler _handler;

    public GetTableByIdHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _handler = new GetTableByIdHandler(_mockUow.Object, _mockMapper.Object);
    }

    [Fact]
    public async Task Handle_WhenTableExists_ShouldReturnMappedDto()
    {
        var tableId = 1;
        var table = new Table { Id = tableId, Name = "Masa 1" };
        var tableDto = new TableDto { Id = tableId };

        _mockUow.Setup(u => u.Table.GetByIdAsync(tableId, false))
                .ReturnsAsync(table);

        _mockMapper.Setup(m => m.Map<TableDto>(table))
                   .Returns(tableDto);

        var result = await _handler.Handle(new GetTableByIdQuery { TableId = tableId }, CancellationToken.None);

        Assert.Equal(tableId, result.Id);
    }

    [Fact]
    public async Task Handle_WhenTableNotFound_ShouldThrowNotFoundException()
    {
        _mockUow.Setup(u => u.Table.GetByIdAsync(999, false))
                .ReturnsAsync((Table?)null);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(new GetTableByIdQuery { TableId = 999 }, CancellationToken.None));

        Assert.Equal("Sipariş bulunamadı.", exception.Message);
    }
}
