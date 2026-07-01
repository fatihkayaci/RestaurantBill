using RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToCashierQuery;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Integration.Tests.Infrastructure;

namespace RestaurantBill.Integration.Tests.Features.Orders;

public class GetAllOrdersToCashierQueryTests : IntegrationTestBase
{
    private readonly GetAllOrdersToCashierQueryHandler _handler;

    public GetAllOrdersToCashierQueryTests()
    {
        _handler = new GetAllOrdersToCashierQueryHandler(UnitOfWork, CurrentUser);
    }

    private async Task<Table> SeedTableAsync(int restaurantId)
    {
        var table = Table.Create("Masa", "", restaurantId);
        await DbContext.Tables.AddAsync(table);
        await DbContext.SaveChangesAsync();
        return table;
    }

    [Fact]
    public async Task Handle_WhenNoServedOrdersExist_ReturnsEmptyList()
    {
        var result = await _handler.Handle(new GetAllOrdersToCashierQuery(), CancellationToken.None);

        Assert.Empty(result);
    }

    [Fact]
    public async Task Handle_ReturnsOnlyServedOrders()
    {
        var table = await SeedTableAsync(RestaurantId);

        var servedOrder = Order.Create(table.Id);
        servedOrder.UpdateStatus(OrderStatus.Served);

        var activeOrder = Order.Create(table.Id);

        await DbContext.Orders.AddRangeAsync(servedOrder, activeOrder);
        await DbContext.SaveChangesAsync();

        var result = await _handler.Handle(new GetAllOrdersToCashierQuery(), CancellationToken.None);

        Assert.Single(result);
        Assert.Equal(OrderStatus.Served, result[0].Status);
    }

    [Fact]
    public async Task Handle_ReturnsOnlyOrdersFromCurrentRestaurant()
    {
        var myTable = await SeedTableAsync(RestaurantId);
        var otherTable = await SeedTableAsync(OtherRestaurantId);

        var myServedOrder = Order.Create(myTable.Id);
        myServedOrder.UpdateStatus(OrderStatus.Served);

        var otherServedOrder = Order.Create(otherTable.Id);
        otherServedOrder.UpdateStatus(OrderStatus.Served);

        await DbContext.Orders.AddRangeAsync(myServedOrder, otherServedOrder);
        await DbContext.SaveChangesAsync();

        var result = await _handler.Handle(new GetAllOrdersToCashierQuery(), CancellationToken.None);

        Assert.Single(result);
        Assert.Equal(myTable.Id, result[0].TableId);
    }
}
