using RestaurantBill.Application.Features.Stats.Queries.GetOverviewStats;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Integration.Tests.Infrastructure;

namespace RestaurantBill.Integration.Tests.Features.Stats;

public class GetOverviewStatsQueryTests : IntegrationTestBase
{
    private readonly GetOverviewStatsQueryHandler _handler;

    public GetOverviewStatsQueryTests()
    {
        _handler = new GetOverviewStatsQueryHandler(AppDb, CurrentUser);
    }

    private async Task<Order> SeedFullyPaidOrderAsync(Guid regionId, Guid branchId, decimal paidAmount, string productName, int quantity)
    {
        var table = Table.Create("Masa", "", regionId);
        var register = CashRegister.Create("Kasa", 0m, branchId);
        await DbContext.Tables.AddAsync(table);
        await DbContext.CashRegisters.AddAsync(register);
        await DbContext.SaveChangesAsync();

        var order = Order.Create(table.Id);
        await DbContext.Orders.AddAsync(order);
        await DbContext.SaveChangesAsync();

        var payment = Payment.Create(order.Id, register.Id, paidAmount, paidAmount, 0m, PaymentMethod.Nakit, quantity);
        await DbContext.Payments.AddAsync(payment);
        await DbContext.PaymentLineItems.AddAsync(
            PaymentLineItem.Create(payment, Guid.NewGuid(), productName, Guid.NewGuid(), "Kategori", paidAmount / quantity, quantity, 0m));
        // Ödeme sonrası kalemler siparişten düşer; kapanmış siparişin tutarı 0'dır.
        order.Close();
        await DbContext.SaveChangesAsync();
        return order;
    }

    [Fact]
    public async Task Handle_CountsRevenueFromPaymentsEvenWhenPaidOrdersHaveNoItemsLeft()
    {
        await SeedFullyPaidOrderAsync(DefaultRegionId, RestaurantId, 300m, "Adana Kebap", 2);
        await SeedFullyPaidOrderAsync(DefaultRegionId, RestaurantId, 100m, "Ayran", 4);

        var result = await _handler.Handle(new GetOverviewStatsQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(400m, result.Value!.TotalRevenue);
        Assert.Equal(2, result.Value.TotalOrders);
        Assert.Equal(200m, result.Value.AvgOrderValue);
        Assert.Equal("Ayran", result.Value.TopProducts[0].Name);
        Assert.Equal(4, result.Value.TopProducts[0].Sold);
    }

    [Fact]
    public async Task Handle_IgnoresPaymentsOfOtherBranches()
    {
        await SeedFullyPaidOrderAsync(DefaultRegionId, RestaurantId, 150m, "Lahmacun", 1);
        await SeedFullyPaidOrderAsync(OtherDefaultRegionId, OtherRestaurantId, 999m, "Künefe", 3);

        var result = await _handler.Handle(new GetOverviewStatsQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(150m, result.Value!.TotalRevenue);
        Assert.Single(result.Value.TopProducts);
    }
}
