using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.DTOs.Reports;
using RestaurantBill.Application.Features.Payments.Commands.CreatePayment;
using RestaurantBill.Application.Features.Reports.Queries.GetProductReport;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;
using RestaurantBill.Infrastructure.Services;
using RestaurantBill.Integration.Tests.Infrastructure;

namespace RestaurantBill.Integration.Tests.Features.Payments;

// Menü hesapta tek satırdır: ödeme menü satırıyla alınır, raporda menü bir kez sayılır, içindeki ürünler sayılmaz.
// Hesap: 2× Adana Menü (₺160) + 1× Köfte (₺300) = ₺620.
public class SetMenuPaymentTests : IntegrationTestBase
{
    private const decimal Rate = 10m;

    private readonly Product _adana;
    private readonly Product _kola;
    private readonly Product _kofte;
    private readonly SetMenu _menu;
    private readonly CashRegister _register;

    public SetMenuPaymentTests()
    {
        User admin = User.Create("Şube Yöneticisi", "admin@test.com", "05000000001");
        DbContext.Users.Add(admin);
        DbContext.Entry(admin).Property(u => u.Id).CurrentValue = UserId;

        Category food = Category.Create("Yemek", RestaurantId);
        DbContext.Categories.Add(food);
        DbContext.SaveChanges();

        _adana = Product.Create("Adana Kebap", 250m, "", food.Id);
        _kola = Product.Create("Kola", 40m, "", food.Id);
        _kofte = Product.Create("Köfte", 300m, "", food.Id);
        DbContext.Products.AddRange(_adana, _kola, _kofte);
        DbContext.SaveChanges();

        // Adana 250 + Kola 40 = 290, menü indirimi 130 → 160.
        _menu = SetMenu.Create(RestaurantId, "Adana Menü");
        _menu.SetContents([
            new SetMenuSlotDraft("Ana yemek", [new SetMenuOptionDraft(_adana, false)]),
            new SetMenuSlotDraft("İçecek", [new SetMenuOptionDraft(_kola, true)]),
        ], DiscountType.Amount, 130m);
        DbContext.SetMenus.Add(_menu);

        _register = CashRegister.Create("Ana Kasa", 1000m, RestaurantId);
        DbContext.CashRegisters.Add(_register);
        DbContext.SaveChanges();
        DbContext.Shifts.Add(Shift.Create(RestaurantId, _register.Id, UserId, 1000m, 1000m));
        DbContext.SaveChanges();
    }

    private async Task<Order> SeedOrderAsync()
    {
        Table table = Table.Create("Masa 3", "", DefaultRegionId);
        table.Occupy();
        DbContext.Tables.Add(table);
        await DbContext.SaveChangesAsync();

        Order order = CreateOrder(table);
        order.AddSetMenu(_menu, new Dictionary<Guid, Guid>(), 2, Rate);
        order.AddItem(_kofte, 1, Rate);
        DbContext.Orders.Add(order);
        await DbContext.SaveChangesAsync();
        return order;
    }

    private Task<Result<bool>> PayAsync(Order order, IEnumerable<(OrderItem Item, int Quantity)> items) =>
        new CreatePaymentCommandHandler(AppDb, new NullTableNotificationService(), new NullCashierNotificationService(), CurrentUser)
            .Handle(new CreatePaymentCommand
            {
                OrderId = order.Id,
                CashRegisterId = _register.Id,
                PaymentMethod = PaymentMethod.Kart,
                Items = items.Select(i => new PaymentItemDto { OrderItemId = i.Item.Id, Quantity = i.Quantity }).ToList(),
            }, CancellationToken.None);

    private Task<Result<bool>> PayAmountAsync(Order order, decimal amount) =>
        new CreatePaymentCommandHandler(AppDb, new NullTableNotificationService(), new NullCashierNotificationService(), CurrentUser)
            .Handle(new CreatePaymentCommand
            {
                OrderId = order.Id,
                CashRegisterId = _register.Id,
                PaymentMethod = PaymentMethod.Nakit,
                Amount = amount,
            }, CancellationToken.None);

    private static OrderItem SetLine(Order order) => order.OrderItems.Single(i => i.IsSetMenu);

    private async Task<ProductReportDto> ProductReportAsync()
    {
        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);
        var report = await new GetProductReportQueryHandler(AppDb, new ReportScopeResolver(AppDb, CurrentUser), new BusinessDayResolver())
            .Handle(new GetProductReportQuery { From = today.AddDays(-1), To = today.AddDays(1) }, CancellationToken.None);
        Assert.True(report.IsSuccess, report.Error);
        return report.Value!;
    }

    [Fact]
    public async Task PayingSetLineInParts_SettlesComponents_AndReportCountsTheSetOnce()
    {
        Order order = await SeedOrderAsync();
        Assert.Equal(620m, order.TotalPrice);

        Result<bool> first = await PayAsync(order, [(SetLine(order), 1)]);
        Assert.True(first.IsSuccess, first.Error);
        Assert.False(first.Value);
        Assert.Equal(460m, order.TotalPrice);
        Assert.All(order.GetSetMenuComponents(SetLine(order)), c => Assert.Equal(1, c.Quantity));

        // "Tamamı": hesapta görünen satırlar gönderilir (menü satırı + köfte); menünün içindekiler gönderilmez.
        Result<bool> rest = await PayAsync(order, order.OrderItems.Where(i => !i.IsSetMenuComponent).Select(i => (i, i.Quantity)).ToList());
        Assert.True(rest.IsSuccess, rest.Error);
        Assert.True(rest.Value);
        Assert.Empty(order.OrderItems);
        Assert.Equal(OrderStatus.Paid, order.Status);

        Assert.Equal(620m, DbContext.Payments.Sum(p => p.TotalAmount));
        List<PaymentLineItem> lines = await DbContext.PaymentLineItems.ToListAsync();
        Assert.DoesNotContain(lines, l => l.ProductName == "Adana Kebap" || l.ProductName == "Kola");
        Assert.All(lines.Where(l => l.ProductName == "Adana Menü"), l => { Assert.Equal(_menu.Id, l.SetMenuId); Assert.Null(l.ProductId); });

        ProductReportDto report = await ProductReportAsync();
        var menuRow = report.Products.Single(p => p.ProductName == "Adana Menü");
        Assert.Equal(_menu.Id, menuRow.ProductId);
        Assert.Equal(2, menuRow.Sold);
        Assert.Equal(320m, Math.Round(menuRow.Revenue, 2));
        Assert.Equal(1, report.Products.Single(p => p.ProductName == "Köfte").Sold);
        Assert.Equal(2, report.Products.Count);
        Assert.Equal(620m, Math.Round(report.CategoryBreakdown.Sum(c => c.Revenue), 2));
        Assert.Contains(report.CategoryBreakdown, c => c.CategoryName == "Menüler");
    }

    [Fact]
    public async Task AmountPayments_IgnoreComponents_AndClosingWritesOneSetLine()
    {
        Order order = await SeedOrderAsync();

        Assert.True((await PayAmountAsync(order, 200m)).IsSuccess);
        Result<bool> closing = await PayAmountAsync(order, 420m);

        Assert.True(closing.IsSuccess, closing.Error);
        Assert.True(closing.Value);
        Assert.Equal(620m, DbContext.Payments.Sum(p => p.TotalAmount));
        PaymentLineItem setLine = await DbContext.PaymentLineItems.SingleAsync(l => l.SetMenuId == _menu.Id);
        Assert.Equal(2, setLine.Quantity);
        Assert.Equal(160m, setLine.UnitPrice);
        Assert.Equal(2, await DbContext.PaymentLineItems.CountAsync());
    }

    [Fact]
    public async Task PayingAComponentOnItsOwn_IsRejected()
    {
        Order order = await SeedOrderAsync();
        OrderItem component = order.GetSetMenuComponents(SetLine(order))[0];

        Result<bool> result = await PayAsync(order, [(component, 2)]);

        Assert.False(result.IsSuccess);
        Assert.Empty(DbContext.Payments);
    }

    private sealed class NullTableNotificationService : ITableNotificationService
    {
        public Task SendTableStatusChangedAsync(Guid restaurantId, Guid tableId, int status) => Task.CompletedTask;
        public Task SendOrderUpdatedAsync(Guid restaurantId, Guid tableId, decimal totalPrice, string createdByUserName) => Task.CompletedTask;
        public Task SendOrderClosedAsync(Guid restaurantId, Guid tableId, Guid orderId) => Task.CompletedTask;
        public Task SendCustomerRequestsChangedAsync(Guid restaurantId) => Task.CompletedTask;
        public Task SendOrderRequestCreatedAsync(Guid restaurantId, OrderRequestCreatedDto payload) => Task.CompletedTask;
        public Task SendCustomerBillRequestedAsync(Guid restaurantId, WaiterCalledDto payload) => Task.CompletedTask;
        public Task SendCustomerActivityAsync(Guid restaurantId, CustomerActivityDto payload) => Task.CompletedTask;
        public Task SendBillRequestChangedAsync(Guid restaurantId, Guid tableId, DateTime? billRequestedAt) => Task.CompletedTask;
        public Task SendItemsReadyAsync(Guid restaurantId, ItemsReadyDto payload) => Task.CompletedTask;
        public Task SendDeliveryItemsReadyAsync(Guid restaurantId, ItemsReadyDto payload) => Task.CompletedTask;
        public Task SendWaiterCalledAsync(Guid restaurantId, WaiterCalledDto payload) => Task.CompletedTask;
    }
}
