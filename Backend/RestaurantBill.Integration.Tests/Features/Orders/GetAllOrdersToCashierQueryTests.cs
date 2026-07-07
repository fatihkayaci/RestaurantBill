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
    public async Task Handle_WhenNoOpenOrdersExist_ReturnsEmptyList()
    {
        var result = await _handler.Handle(new GetAllOrdersToCashierQuery(), CancellationToken.None);

        Assert.Empty(result);
    }

    [Fact]
    public async Task Handle_ReturnsOpenOrders_ExcludingPaidAndCancelled()
    {
        var table = await SeedTableAsync(RestaurantId);

        var activeOrder = Order.Create(table.Id);

        var servedOrder = Order.Create(table.Id);
        servedOrder.UpdateStatus(OrderStatus.Served);

        var paidOrder = Order.Create(table.Id);
        paidOrder.Close();

        var cancelledOrder = Order.Create(table.Id);
        cancelledOrder.Cancel();

        await DbContext.Orders.AddRangeAsync(activeOrder, servedOrder, paidOrder, cancelledOrder);
        await DbContext.SaveChangesAsync();

        var result = await _handler.Handle(new GetAllOrdersToCashierQuery(), CancellationToken.None);

        Assert.Equal(2, result.Count);
        Assert.Contains(result, o => o.Status == OrderStatus.Active);
        Assert.Contains(result, o => o.Status == OrderStatus.Served);
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
