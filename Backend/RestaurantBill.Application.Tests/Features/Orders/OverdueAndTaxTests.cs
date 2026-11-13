using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder;
using RestaurantBill.Application.Features.Orders.Overdue;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Orders;

public class OverdueAndTaxTests : ApplicationTestBase
{
    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private async Task<(Branch Branch, Category Category)> SeedBranchAsync(decimal branchTax, decimal? categoryTax)
    {
        Branch branch = Branch.Create(Guid.NewGuid(), "Merkez", "Y", "111", "a@mail.com", "İstanbul", "Kadıköy", "Adres", branchTax);
        SetId(branch, CurrentUser.BranchId);
        DbContext.Branches.Add(branch);
        Category category = Category.Create("Ana Yemek", branch.Id, categoryTax);
        DbContext.Categories.Add(category);
        await DbContext.SaveChangesAsync();
        return (branch, category);
    }

    private async Task<Order> SeedOrderAsync(Guid categoryId, int? prepMinutes, DateTime createdAt)
    {
        Region region = Region.Create("Salon", CurrentUser.BranchId);
        DbContext.Regions.Add(region);
        Table table = Table.Create("Masa 4", "", region.Id);
        DbContext.Tables.Add(table);
        Product product = Product.Create("Köfte", 100m, "", categoryId);
        product.SetPrepMinutes(prepMinutes);
        DbContext.Products.Add(product);
        Order order = Order.Create(table.Id);
        order.AddItem(product, 2);
        DbContext.Orders.Add(order);
        await DbContext.SaveChangesAsync();

        // SaveChanges yeni kayıtların CreatedAt'ini "şimdi"ye çeker; testte geçmişe alınır.
        OrderItem item = order.OrderItems.Single();
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.CreatedAt))!.SetValue(item, createdAt);
        await DbContext.SaveChangesAsync();
        return order;
    }

    [Fact]
    public async Task Notifier_SendsOverdueItemToBranchManagers_OnlyOnce()
    {
        var (_, category) = await SeedBranchAsync(10m, null);
        DateTime now = DateTime.UtcNow;
        Order order = await SeedOrderAsync(category.Id, prepMinutes: 10, createdAt: now.AddMinutes(-12));
        var notifications = new FakeCashierNotificationService();
        var notifier = new OverdueOrderItemNotifier(Db, notifications);

        int first = await notifier.NotifyNewlyOverdueAsync(now, CancellationToken.None);
        int second = await notifier.NotifyNewlyOverdueAsync(now.AddMinutes(1), CancellationToken.None);

        Assert.Equal(1, first);
        Assert.Equal(0, second);
        var (branchId, items) = Assert.Single(notifications.OverdueSent);
        Assert.Equal(CurrentUser.BranchId, branchId);
        OverdueOrderItemDto dto = Assert.Single(items);
        Assert.Equal("Masa 4", dto.TableName);
        Assert.Equal("Köfte", dto.ProductName);
        Assert.Equal(2, dto.Quantity);
        Assert.NotNull((await DbContext.OrderItems.SingleAsync()).OverdueNotifiedAt);
    }

    [Fact]
    public async Task Notifier_IgnoresItemsNotYetDue_ReadyItems_AndItemsWithoutPrepTime()
    {
        var (_, category) = await SeedBranchAsync(10m, null);
        DateTime now = DateTime.UtcNow;
        await SeedOrderAsync(category.Id, prepMinutes: 30, createdAt: now.AddMinutes(-5));
        await SeedOrderAsync(category.Id, prepMinutes: null, createdAt: now.AddMinutes(-90));
        Order ready = await SeedOrderAsync(category.Id, prepMinutes: 5, createdAt: now.AddMinutes(-20));
        ready.UpdateStatus(OrderStatus.Ready);
        await DbContext.SaveChangesAsync();
        var notifications = new FakeCashierNotificationService();

        int count = await new OverdueOrderItemNotifier(Db, notifications).NotifyNewlyOverdueAsync(now, CancellationToken.None);

        Assert.Equal(0, count);
        Assert.Empty(notifications.OverdueSent);
    }

    [Theory]
    [InlineData(null, 20.0, 20.0)]   // ürüne özel oran yok → kategori
    [InlineData(1.0, 20.0, 1.0)]     // ürüne özel oran → onu kullan
    [InlineData(null, null, 10.0)]   // ikisi de yok → şube
    public async Task AddProductToOrder_UsesProductOverride_ElseCategory_ElseBranch(double? productTax, double? categoryTax, double expected)
    {
        var (_, category) = await SeedBranchAsync(10m, (decimal?)categoryTax);
        await SeedActorAsync();
        Region region = Region.Create("Salon", CurrentUser.BranchId);
        DbContext.Regions.Add(region);
        Table table = Table.Create("Masa 1", "", region.Id);
        DbContext.Tables.Add(table);
        Product product = Product.Create("Ayran", 30m, "", category.Id);
        product.SetTaxRate((decimal?)productTax);
        DbContext.Products.Add(product);
        Order order = Order.Create(table.Id);
        DbContext.Orders.Add(order);
        await DbContext.SaveChangesAsync();

        var handler = new AddProductToOrderCommandHandler(Db, new FakeTableNotificationService(), new FakeCashierNotificationService(), CurrentUser);
        var result = await handler.Handle(new AddProductToOrderCommand
        {
            OrderId = order.Id,
            OrderItems = [new CreateOrderItemDto { ProductId = product.Id, Quantity = 1 }]
        }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal((decimal)expected, Assert.Single(order.OrderItems).TaxRate);
    }
}
