using AutoMapper;
using Moq;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Tables.Queries.GetAll;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Tables;

public class GetAllTableQueryHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly GetAllTableQueryHandler _handler;

    public GetAllTableQueryHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _handler = new GetAllTableQueryHandler(_mockUow.Object, _mockMapper.Object);
    }

    [Fact]
    public async Task Handle_WhenTablesExist_ShouldReturnMappedList()
    {
        var tables = new List<Table> { new() { Id = 1, Name = "Masa 1" }, new() { Id = 2, Name = "Masa 2" } };
        var tableDtos = new List<TableDto> { new() { Id = 1 }, new() { Id = 2 } };

        _mockUow.Setup(u => u.Table.GetAllAsync(null, false, null))
                .ReturnsAsync(tables);

        _mockMapper.Setup(m => m.Map<List<TableDto>>(It.IsAny<object>()))
                   .Returns(tableDtos);

        var result = await _handler.Handle(new GetAllTableQuery(), CancellationToken.None);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task Handle_WhenNoTablesExist_ShouldReturnEmptyList()
    {
        _mockUow.Setup(u => u.Table.GetAllAsync(null, false, null))
                .ReturnsAsync(new List<Table>());

        _mockMapper.Setup(m => m.Map<List<TableDto>>(It.IsAny<object>()))
                   .Returns(new List<TableDto>());

        var result = await _handler.Handle(new GetAllTableQuery(), CancellationToken.None);

        Assert.Empty(result);
    }
}
