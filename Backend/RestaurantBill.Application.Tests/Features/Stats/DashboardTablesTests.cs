using RestaurantBill.Application.Features.Stats.Queries.GetDashboard;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Stats;

// Genel Bakış "Masa durumu" kartı yalnızca /stats/dashboard'u okur: masa başına ödeme, hesap isteği,
// kalem durumları ve QR isteği bu yanıtta, masa adıyla değil kimlikle gelir.
public class DashboardTablesTests : ApplicationTestBase
{
    private async Task SeedBranchAsync()
    {
        Branch branch = Branch.Create(Guid.NewGuid(), "Merkez", "Y", "111", "a@mail.com", "İstanbul", "Kadıköy", "Adres", 10m);
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(branch, CurrentUser.BranchId);
        DbContext.Branches.Add(branch);
        await DbContext.SaveChangesAsync();
    }

    private async Task<Product> SeedProductAsync(string name, decimal price)
    {
        Product product = Product.Create(name, price, "", await DefaultCategoryIdAsync());
        DbContext.Products.Add(product);
        await DbContext.SaveChangesAsync();
        return product;
    }

    private static void SetStatus(Order order, string productName, OrderItemStatus status) =>
        order.OrderItems.Single(i => i.Product!.Name == productName).UpdateStatus(status);

    [Fact]
    public async Task Dashboard_ReturnsPerTablePaymentBillRequestAndItemCounts()
    {
        await SeedBranchAsync();
        Table busy = await SeedTableAsync();
        busy.Occupy();
        Table idle = await SeedTableAsync();

        Order order = Order.Create(busy.Id, CurrentUser.BranchId);
        order.AddItem(await SeedProductAsync("Çay", 20m), 2);
        order.AddItem(await SeedProductAsync("Kebap", 300m), 1);
        order.AddItem(await SeedProductAsync("Ayran", 30m), 3);
        SetStatus(order, "Çay", OrderItemStatus.Ready);
        SetStatus(order, "Ayran", OrderItemStatus.Served);
        order.PayOnAccount(100m);
        DateTime billAt = DateTime.UtcNow.AddMinutes(-5);
        order.RequestBill(billAt);
        DbContext.Orders.Add(order);

        // Paket sipariş masa kartlarına girmez.
        Order delivery = Order.CreateDelivery(CurrentUser.BranchId, 0m);
        delivery.AddItem(await SeedProductAsync("Lahmacun", 100m), 4);
        DbContext.Orders.Add(delivery);

        DbContext.OrderRequests.Add(OrderRequest.Create(idle.Id, null));
        await DbContext.SaveChangesAsync();

        var result = await new GetDashboardQueryHandler(Db, CurrentUser).Handle(new GetDashboardQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        var tables = result.Value!.Regions.SelectMany(r => r.Tables).ToDictionary(t => t.Id);

        var busyDto = tables[busy.Id];
        Assert.Equal(430m, busyDto.ActiveOrderTotal);
        Assert.Equal(100m, busyDto.PaidAmount);
        Assert.Equal(330m, busyDto.RemainingAmount);
        Assert.Equal(billAt, busyDto.BillRequestedAt);
        Assert.Equal(1, busyDto.KitchenItems);
        Assert.Equal(2, busyDto.ReadyItems);
        Assert.Equal(3, busyDto.ServedItems);

        var idleDto = tables[idle.Id];
        Assert.Equal(0, idleDto.KitchenItems + idleDto.ReadyItems + idleDto.ServedItems);
        Assert.Null(idleDto.BillRequestedAt);

        Assert.Equal([idle.Id], result.Value.Pending.OrderRequestTableIds);
    }
}
