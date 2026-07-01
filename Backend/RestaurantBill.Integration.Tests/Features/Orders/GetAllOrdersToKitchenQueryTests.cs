using RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToKitchen;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Integration.Tests.Infrastructure;

namespace RestaurantBill.Integration.Tests.Features.Orders;

public class GetAllOrdersToKitchenQueryTests : IntegrationTestBase
{
    private readonly GetAllOrdersToKitchenQueryHandler _handler;

    public GetAllOrdersToKitchenQueryTests()
    {
        _handler = new GetAllOrdersToKitchenQueryHandler(UnitOfWork, CurrentUser);
    }

    private async Task<Table> SeedTableAsync(int restaurantId)
    {
        var table = Table.Create("Masa", "", restaurantId);
        await DbContext.Tables.AddAsync(table);
        await DbContext.SaveChangesAsync();
        return table;
    }

    [Fact]
    public async Task Handle_WhenNoOrdersExist_ReturnsEmptyList()
    {
        var result = await _handler.Handle(new GetAllOrdersToKitchenQuery(), CancellationToken.None);

        Assert.Empty(result);
    }

    [Fact]
    public async Task Handle_ExcludesPaidOrders()
    {
        var table = await SeedTableAsync(RestaurantId);

        var activeOrder = Order.Create(table.Id);
        var paidOrder = Order.Create(table.Id);
        paidOrder.Close();

        await DbContext.Orders.AddRangeAsync(activeOrder, paidOrder);
        await DbContext.SaveChangesAsync();

        var result = await _handler.Handle(new GetAllOrdersToKitchenQuery(), CancellationToken.None);

        Assert.Single(result);
        Assert.Equal(OrderStatus.Active, result[0].Status);
    }

    [Fact]
    public async Task Handle_ExcludesCancelledOrders()
    {
        var table = await SeedTableAsync(RestaurantId);

        var activeOrder = Order.Create(table.Id);
        var cancelledOrder = Order.Create(table.Id);
        cancelledOrder.Cancel();

        await DbContext.Orders.AddRangeAsync(activeOrder, cancelledOrder);
        await DbContext.SaveChangesAsync();

        var result = await _handler.Handle(new GetAllOrdersToKitchenQuery(), CancellationToken.None);

        Assert.Single(result);
        Assert.Equal(OrderStatus.Active, result[0].Status);
    }

    [Fact]
    public async Task Handle_ReturnsOnlyOrdersFromCurrentRestaurant()
    {
        var myTable = await SeedTableAsync(RestaurantId);
        var otherTable = await SeedTableAsync(OtherRestaurantId);

        await DbContext.Orders.AddRangeAsync(
            Order.Create(myTable.Id),
            Order.Create(otherTable.Id)
        );
        await DbContext.SaveChangesAsync();

        var result = await _handler.Handle(new GetAllOrdersToKitchenQuery(), CancellationToken.None);

        Assert.Single(result);
        Assert.Equal(myTable.Id, result[0].TableId);
    }
}
