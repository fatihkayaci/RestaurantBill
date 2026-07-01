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
        await DbContext.Tables.AddRangeAsync(
            Table.Create("Masa 1", "", RestaurantId),
            Table.Create("Masa 2", "", OtherRestaurantId)
        );
        await DbContext.SaveChangesAsync();

        var result = await _handler.Handle(new GetAllTableQuery(), CancellationToken.None);

        Assert.Single(result);
        Assert.Equal("Masa 1", result[0].Name);
    }

    [Fact]
    public async Task Handle_ReturnsTablesOrderedByName()
    {
        await DbContext.Tables.AddRangeAsync(
            Table.Create("C Masa", "", RestaurantId),
            Table.Create("A Masa", "", RestaurantId),
            Table.Create("B Masa", "", RestaurantId)
        );
        await DbContext.SaveChangesAsync();

        var result = await _handler.Handle(new GetAllTableQuery(), CancellationToken.None);

        Assert.Equal(3, result.Count);
        Assert.Equal("A Masa", result[0].Name);
        Assert.Equal("B Masa", result[1].Name);
        Assert.Equal("C Masa", result[2].Name);
    }
}
