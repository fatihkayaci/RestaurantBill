using RestaurantBill.Application.Features.Orders.Queries;
using RestaurantBill.Application.Features.Orders.Queries.GetActiveOrderByTableId;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Integration.Tests.Infrastructure;

namespace RestaurantBill.Integration.Tests.Features.Orders;

public class GetActiveOrderByTableIdQueryTests : IntegrationTestBase
{
    private readonly GetActiveOrderByTableIdHandler _handler;

    public GetActiveOrderByTableIdQueryTests()
    {
        _handler = new GetActiveOrderByTableIdHandler(new OrderQueries(AppDb));
    }

    [Fact]
    public async Task Handle_ReturnsActiveOrderForGivenTable()
    {
        var table = Table.Create("Masa 1", "", RestaurantId);
        table.AssignRegion(DefaultRegionId);
        await DbContext.Tables.AddAsync(table);
        await DbContext.SaveChangesAsync();

        var order = Order.Create(table.Id);
        await DbContext.Orders.AddAsync(order);
        await DbContext.SaveChangesAsync();

        var result = await _handler.Handle(
            new GetActiveOrderByTableIdQuery { TableId = table.Id },
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(table.Id, result.Value!.TableId);
        Assert.Equal(OrderStatus.Active, result.Value!.Status);
    }

    [Fact]
    public async Task Handle_WhenMultipleTablesExist_ReturnsOrderForCorrectTable()
    {
        var table1 = Table.Create("Masa 1", "", RestaurantId);
        table1.AssignRegion(DefaultRegionId);
        var table2 = Table.Create("Masa 2", "", RestaurantId);
        table2.AssignRegion(DefaultRegionId);
        await DbContext.Tables.AddRangeAsync(table1, table2);
        await DbContext.SaveChangesAsync();

        var orderForTable1 = Order.Create(table1.Id);
        var orderForTable2 = Order.Create(table2.Id);
        await DbContext.Orders.AddRangeAsync(orderForTable1, orderForTable2);
        await DbContext.SaveChangesAsync();

        var result = await _handler.Handle(
            new GetActiveOrderByTableIdQuery { TableId = table2.Id },
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(table2.Id, result.Value!.TableId);
    }
}
