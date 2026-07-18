using RestaurantBill.Application.Features.Tables.Queries.GetAllTable;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Integration.Tests.Infrastructure;

namespace RestaurantBill.Integration.Tests.Features.Tables;

public class GetAllTablesQueryTests : IntegrationTestBase
{
    private readonly GetAllTableQueryHandler _handler;

    public GetAllTablesQueryTests()
    {
        _handler = new GetAllTableQueryHandler(UnitOfWork, CurrentUser);
    }

    [Fact]
    public async Task Handle_WhenNoTablesExist_ReturnsEmptyList()
    {
        var result = await _handler.Handle(new GetAllTableQuery(), CancellationToken.None);

        Assert.Empty(result);
    }

    [Fact]
    public async Task Handle_ReturnsOnlyTablesForCurrentRestaurant()
    {
        var table1 = Table.Create("Masa 1", "", RestaurantId);
        table1.AssignRegion(DefaultRegionId);
        var table2 = Table.Create("Masa 2", "", OtherRestaurantId);
        table2.AssignRegion(OtherDefaultRegionId);
        await DbContext.Tables.AddRangeAsync(table1, table2);
        await DbContext.SaveChangesAsync();

        var result = await _handler.Handle(new GetAllTableQuery(), CancellationToken.None);

        Assert.Single(result);
        Assert.Equal("Masa 1", result[0].Name);
    }

    [Fact]
    public async Task Handle_ReturnsTablesOrderedByName()
    {
        var tableC = Table.Create("C Masa", "", RestaurantId);
        tableC.AssignRegion(DefaultRegionId);
        var tableA = Table.Create("A Masa", "", RestaurantId);
        tableA.AssignRegion(DefaultRegionId);
        var tableB = Table.Create("B Masa", "", RestaurantId);
        tableB.AssignRegion(DefaultRegionId);
        await DbContext.Tables.AddRangeAsync(tableC, tableA, tableB);
        await DbContext.SaveChangesAsync();

        var result = await _handler.Handle(new GetAllTableQuery(), CancellationToken.None);

        Assert.Equal(3, result.Count);
        Assert.Equal("A Masa", result[0].Name);
        Assert.Equal("B Masa", result[1].Name);
        Assert.Equal("C Masa", result[2].Name);
    }
}
