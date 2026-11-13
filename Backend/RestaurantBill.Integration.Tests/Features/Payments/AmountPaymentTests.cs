using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Orders.Commands.CancelOrder;
using RestaurantBill.Application.Features.Orders.Commands.TransferOrder;
using RestaurantBill.Application.Features.Orders.Queries;
using RestaurantBill.Application.Features.Payments.Commands.CreatePayment;
using RestaurantBill.Application.Features.Reports.Queries.GetProductReport;
using RestaurantBill.Application.Features.Reports.Queries.GetSalesReport;
using RestaurantBill.Application.Features.Reports.Queries.GetTaxReport;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;
using RestaurantBill.Infrastructure.Services;
using RestaurantBill.Integration.Tests.Infrastructure;

namespace RestaurantBill.Integration.Tests.Features.Payments;

// "Tutar gir": ürün seçmeden tutar ödenir, ürünler masada kalır; kalan 0'a inince hesap kapanır.
// Hesap: 2× Köfte (₺300, KDV %10) + 2× Bira (₺150, KDV %20) = ₺900.
public class AmountPaymentTests : IntegrationTestBase
{
    private const decimal FoodRate = 10m;
    private const decimal DrinkRate = 20m;

    private readonly Product _kofte;
    private readonly Product _bira;
    private readonly CashRegister _register;

    public AmountPaymentTests()
    {
        // Ödeme denetim kaydına işlemi yapanın adını yazar.
        User admin = User.Create("Şube Yöneticisi", "admin@test.com", "05000000001");
        DbContext.Users.Add(admin);
        DbContext.Entry(admin).Property(u => u.Id).CurrentValue = UserId;

        Category food = Category.Create("Yemek", RestaurantId);
        Category drink = Category.Create("İçecek", RestaurantId);
        DbContext.Categories.AddRange(food, drink);
        DbContext.SaveChanges();

        _kofte = Product.Create("Köfte", 300m, "", food.Id);
        _bira = Product.Create("Bira", 150m, "", drink.Id);
        DbContext.Products.AddRange(_kofte, _bira);

        _register = CashRegister.Create("Ana Kasa", 1000m, RestaurantId);
        DbContext.CashRegisters.Add(_register);
        DbContext.SaveChanges();
        DbContext.Shifts.Add(Shift.Create(RestaurantId, _register.Id, UserId, 1000m, 1000m));
        DbContext.SaveChanges();
    }

    private async Task<(Order Order, Table Table)> SeedOrderAsync(int kofte = 2, int bira = 2, string tableName = "Masa 6")
    {
        Table table = Table.Create(tableName, "", DefaultRegionId);
        table.Occupy();
        DbContext.Tables.Add(table);
        await DbContext.SaveChangesAsync();

        Order order = Order.Create(table.Id);
        if (kofte > 0) order.AddItem(_kofte, kofte, FoodRate);
        if (bira > 0) order.AddItem(_bira, bira, DrinkRate);
        DbContext.Orders.Add(order);
        await DbContext.SaveChangesAsync();
        return (order, table);
    }

    private CreatePaymentCommandHandler Handler() =>
        new(AppDb, new NullTableNotificationService(), new NullCashierNotificationService(), CurrentUser);

    private Task<Result<bool>> PayAmountAsync(Order order, decimal amount, PaymentMethod method = PaymentMethod.Kart) =>
        Handler().Handle(new CreatePaymentCommand
        {
            OrderId = order.Id,
            CashRegisterId = _register.Id,
            PaymentMethod = method,
            Amount = amount,
        }, CancellationToken.None);

    private Task<Result<bool>> PayItemsAsync(Order order, IEnumerable<(OrderItem Item, int Quantity)> items,
        PaymentMethod method = PaymentMethod.Kart, decimal? discountPercent = null) =>
        Handler().Handle(new CreatePaymentCommand
        {
            OrderId = order.Id,
            CashRegisterId = _register.Id,
            PaymentMethod = method,
            Items = items.Select(i => new PaymentItemDto { OrderItemId = i.Item.Id, Quantity = i.Quantity }).ToList(),
            DiscountPercent = discountPercent,
        }, CancellationToken.None);

    private Task<Result<bool>> PayAllItemsAsync(Order order, PaymentMethod method = PaymentMethod.Kart, decimal? discountPercent = null) =>
        PayItemsAsync(order, order.OrderItems.Select(i => (i, i.Quantity)).ToList(), method, discountPercent);

    private Dictionary<decimal, decimal> TotalsByRate() =>
        DbContext.Payments.AsEnumerable().GroupBy(p => p.TaxRate).ToDictionary(g => g.Key, g => g.Sum(p => p.TotalAmount));

    private ReportScopeResolver Scope() => new(AppDb, CurrentUser);
    private static DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow);

    [Fact]
    public async Task SeveralAmountPayments_ThenRemaining_ClosesOrder_WithCorrectTotalsAndReports()
    {
        var (order, table) = await SeedOrderAsync();

        Result<bool> first = await PayAmountAsync(order, 300m, PaymentMethod.Kart);
        Assert.True(first.IsSuccess, first.Error);
        Assert.False(first.Value);
        Assert.Equal(300m, order.PaidOnAccount);
        Assert.Equal(600m, order.RemainingAmount);
        Assert.Equal(900m, order.TotalPrice);
        Assert.Equal(4, order.OrderItems.Sum(i => i.Quantity));
        Assert.Equal(TableStatus.Occupied, table.Status);
        // Kalan hesabın oranlarına orantılı: 600/900 yemek, 300/900 içecek.
        Assert.Equal(200m, DbContext.Payments.Single(p => p.TaxRate == FoodRate).TotalAmount);
        Assert.Equal(100m, DbContext.Payments.Single(p => p.TaxRate == DrinkRate).TotalAmount);
        Assert.All(DbContext.Payments, p => { Assert.True(p.IsOnAccount); Assert.Equal(0, p.ItemCount); });
        Assert.Empty(DbContext.PaymentLineItems);

        Result<bool> second = await PayAmountAsync(order, 200m, PaymentMethod.Nakit);
        Assert.True(second.IsSuccess, second.Error);
        Assert.False(second.Value);
        Assert.Equal(400m, order.RemainingAmount);

        Result<bool> last = await PayAmountAsync(order, 400m, PaymentMethod.Nakit);
        Assert.True(last.IsSuccess, last.Error);
        Assert.True(last.Value);

        Assert.Equal(OrderStatus.Paid, order.Status);
        Assert.Equal(0m, order.PaidOnAccount);
        Assert.Empty(order.OrderItems);
        Assert.Equal(TableStatus.Available, table.Status);

        // Toplam ve oran başına tutarlar ürünlerin gerçek dağılımına eşit.
        Assert.Equal(900m, DbContext.Payments.Sum(p => p.TotalAmount));
        Dictionary<decimal, decimal> byRate = TotalsByRate();
        Assert.Equal(600m, byRate[FoodRate]);
        Assert.Equal(300m, byRate[DrinkRate]);
        Assert.All(DbContext.Payments, p => Assert.Equal(p.TotalAmount, p.Matrah + p.TaxAmount));

        // Ürünler tek kez, kapanış ödemesinde yazılır.
        List<PaymentLineItem> lines = await DbContext.PaymentLineItems.ToListAsync();
        Assert.Equal(2, lines.Where(l => l.ProductName == "Köfte").Sum(l => l.Quantity));
        Assert.Equal(2, lines.Where(l => l.ProductName == "Bira").Sum(l => l.Quantity));

        // Kasaya yalnızca nakit kısımlar girer.
        Assert.Equal(1600m, _register.Balance);
        Assert.Equal(600m, DbContext.CashTransactions.Sum(t => t.Amount));

        var productReport = await new GetProductReportQueryHandler(AppDb, Scope(), new BusinessDayResolver())
            .Handle(new GetProductReportQuery { From = Today.AddDays(-1), To = Today.AddDays(1) }, CancellationToken.None);
        Assert.True(productReport.IsSuccess, productReport.Error);
        var kofteRow = productReport.Value!.Products.Single(p => p.ProductName == "Köfte");
        var biraRow = productReport.Value.Products.Single(p => p.ProductName == "Bira");
        Assert.Equal(2, kofteRow.Sold);
        Assert.Equal(600m, Math.Round(kofteRow.Revenue, 2));
        Assert.Equal(2, biraRow.Sold);
        Assert.Equal(300m, Math.Round(biraRow.Revenue, 2));

        var taxReport = await new GetTaxReportQueryHandler(AppDb, Scope(), new BusinessDayResolver())
            .Handle(new GetTaxReportQuery { From = Today.AddDays(-1), To = Today.AddDays(1) }, CancellationToken.None);
        Assert.Equal(600m, taxReport.Value!.Rates.Single(r => r.TaxRatePercent == FoodRate).Total);
        Assert.Equal(300m, taxReport.Value.Rates.Single(r => r.TaxRatePercent == DrinkRate).Total);
        Assert.Equal(900m, taxReport.Value.TotalAmount);

        var sales = await new GetSalesReportQueryHandler(AppDb, Scope(), new BusinessDayResolver())
            .Handle(new GetSalesReportQuery { From = Today.AddDays(-1), To = Today.AddDays(1) }, CancellationToken.None);
        Assert.Equal(900m, sales.Value!.TotalRevenue);
        Assert.Equal(1, sales.Value.TransactionCount);
    }

    [Fact]
    public async Task AmountAboveRemaining_IsRejected()
    {
        var (order, _) = await SeedOrderAsync();
        Assert.True((await PayAmountAsync(order, 500m)).IsSuccess);

        Result<bool> result = await PayAmountAsync(order, 400.01m);

        Assert.False(result.IsSuccess);
        Assert.Contains("kalan tutardan", result.Error);
        Assert.Equal(500m, order.PaidOnAccount);
        Assert.Equal(500m, DbContext.Payments.Sum(p => p.TotalAmount));
    }

    [Fact]
    public async Task AmountEqualToTotal_WithoutPriorPayments_ActsLikeFullPayment()
    {
        var (order, _) = await SeedOrderAsync();

        Result<bool> result = await PayAmountAsync(order, 900m, PaymentMethod.Nakit);

        Assert.True(result.IsSuccess, result.Error);
        Assert.True(result.Value);
        Assert.All(DbContext.Payments, p => { Assert.False(p.IsOnAccount); Assert.Equal(0m, p.PrepaidAmount); });
        Assert.Equal(4, DbContext.PaymentLineItems.Sum(l => l.Quantity));
        Assert.Equal(1900m, _register.Balance);
    }

    [Fact]
    public async Task ItemPayment_ThenAmount_BlocksItemSelection_ButSettlesWithAllItemsAndDiscount()
    {
        var (order, _) = await SeedOrderAsync();
        OrderItem kofte = order.OrderItems.Single(i => i.ProductId == _kofte.Id);

        // Önce ürün seçerek: 1 köfte.
        Assert.True((await PayItemsAsync(order, [(kofte, 1)])).IsSuccess);
        Assert.Equal(600m, order.RemainingAmount);

        Assert.True((await PayAmountAsync(order, 100m)).IsSuccess);
        Assert.Equal(500m, order.RemainingAmount);

        // Hesaba ödeme sonrası ürün seçerek kısmi ödeme alınmaz.
        OrderItem bira = order.OrderItems.Single(i => i.ProductId == _bira.Id);
        Result<bool> partial = await PayItemsAsync(order, [(bira, 1)]);
        Assert.False(partial.IsSuccess);
        Assert.Contains("ürün seçerek", partial.Error);

        // "Tamamı" + %10 indirim: indirim kalan ₺500'e uygulanır.
        Result<bool> final = await PayAllItemsAsync(order, PaymentMethod.Kart, discountPercent: 10m);
        Assert.True(final.IsSuccess, final.Error);
        Assert.True(final.Value);

        Assert.Equal(850m, DbContext.Payments.Sum(p => p.TotalAmount));
        Assert.Equal(50m, DbContext.Payments.Sum(p => p.DiscountAmount));
        Assert.Equal(100m, DbContext.Payments.Where(p => !p.IsOnAccount).Sum(p => p.PrepaidAmount));

        var report = await new GetProductReportQueryHandler(AppDb, Scope(), new BusinessDayResolver())
            .Handle(new GetProductReportQuery { From = Today.AddDays(-1), To = Today.AddDays(1) }, CancellationToken.None);
        Assert.Equal(2, report.Value!.Products.Single(p => p.ProductName == "Köfte").Sold);
        Assert.Equal(2, report.Value.Products.Single(p => p.ProductName == "Bira").Sold);
        // Ürün cirosu = tahsil edilen toplam (indirim düşülmüş, hesaba ödemeler dahil).
        Assert.Equal(850m, Math.Round(report.Value.Products.Sum(p => p.Revenue), 2));
    }

    [Fact]
    public async Task AmountPayment_WithDiscount_IsRejected()
    {
        var (order, _) = await SeedOrderAsync();

        Result<bool> result = await Handler().Handle(new CreatePaymentCommand
        {
            OrderId = order.Id,
            CashRegisterId = _register.Id,
            PaymentMethod = PaymentMethod.Kart,
            Amount = 100m,
            DiscountPercent = 10m,
        }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Empty(DbContext.Payments);
    }

    [Fact]
    public async Task CancelOrder_WithAmountPayment_IsBlocked()
    {
        var (order, table) = await SeedOrderAsync();
        Assert.True((await PayAmountAsync(order, 300m)).IsSuccess);

        Result result = await new CancelOrderCommandHandler(AppDb, new NullTableNotificationService(), new NullCashierNotificationService(), CurrentUser)
            .Handle(new CancelOrderCommand { OrderId = order.Id }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("iptal edilemez", result.Error);
        Assert.NotEqual(OrderStatus.Cancelled, order.Status);
        Assert.Equal(TableStatus.Occupied, table.Status);
    }

    [Fact]
    public async Task MergeTables_CarriesPaidAmount_AndFinalPaymentNetsIt()
    {
        var (source, sourceTable) = await SeedOrderAsync(tableName: "Masa 6");
        var (target, targetTable) = await SeedOrderAsync(kofte: 0, bira: 1, tableName: "Masa 7");
        Assert.True((await PayAmountAsync(source, 300m)).IsSuccess);

        Result<bool> merge = await new TransferOrderCommandHandler(AppDb, new OrderQueries(AppDb), new NullTableNotificationService(),
                new NullCashierNotificationService(), CurrentUser)
            .Handle(new TransferOrderCommand { SourceTableId = sourceTable.Id, DestinationTableId = targetTable.Id, Mode = TableTransferMode.Merge },
                CancellationToken.None);
        Assert.True(merge.IsSuccess, merge.Error);

        Assert.Equal(OrderStatus.Cancelled, source.Status);
        Assert.Equal(0m, source.PaidOnAccount);
        Assert.Equal(1050m, target.TotalPrice);
        Assert.Equal(300m, target.PaidOnAccount);
        Assert.Equal(750m, target.RemainingAmount);
        Assert.All(DbContext.Payments, p => Assert.Equal(target.Id, p.OrderId));

        Result<bool> final = await PayAllItemsAsync(target);
        Assert.True(final.IsSuccess, final.Error);
        Assert.True(final.Value);
        Assert.Equal(1050m, DbContext.Payments.Sum(p => p.TotalAmount));
        Dictionary<decimal, decimal> byRate = TotalsByRate();
        Assert.Equal(600m, byRate[FoodRate]);
        Assert.Equal(450m, byRate[DrinkRate]);
    }

    [Fact]
    public async Task MoveTable_KeepsPaidAmount()
    {
        var (order, sourceTable) = await SeedOrderAsync(tableName: "Masa 6");
        Table destination = Table.Create("Masa 8", "", DefaultRegionId);
        DbContext.Tables.Add(destination);
        await DbContext.SaveChangesAsync();
        Assert.True((await PayAmountAsync(order, 250m)).IsSuccess);

        Result<bool> move = await new TransferOrderCommandHandler(AppDb, new OrderQueries(AppDb), new NullTableNotificationService(),
                new NullCashierNotificationService(), CurrentUser)
            .Handle(new TransferOrderCommand { SourceTableId = sourceTable.Id, DestinationTableId = destination.Id, Mode = TableTransferMode.Move },
                CancellationToken.None);

        Assert.True(move.IsSuccess, move.Error);
        Assert.Equal(destination.Id, order.TableId);
        Assert.Equal(250m, order.PaidOnAccount);
        Assert.Equal(650m, order.RemainingAmount);
    }

    [Fact]
    public async Task BillRequest_StaysUntilFullySettled()
    {
        var (order, _) = await SeedOrderAsync();
        order.RequestBill(DateTime.UtcNow);
        await DbContext.SaveChangesAsync();

        Assert.True((await PayAmountAsync(order, 300m)).IsSuccess);
        Assert.NotNull(order.BillRequestedAt);

        Assert.True((await PayAmountAsync(order, 600m)).IsSuccess);
        Assert.Null(order.BillRequestedAt);
    }

    private sealed class NullTableNotificationService : ITableNotificationService
    {
        public Task SendTableStatusChangedAsync(Guid restaurantId, Guid tableId, int status) => Task.CompletedTask;
        public Task SendOrderUpdatedAsync(Guid restaurantId, Guid tableId, decimal totalPrice, string createdByUserName) => Task.CompletedTask;
        public Task SendOrderClosedAsync(Guid restaurantId, Guid tableId, Guid orderId) => Task.CompletedTask;
        public Task SendCustomerRequestsChangedAsync(Guid restaurantId) => Task.CompletedTask;
        public Task SendBillRequestChangedAsync(Guid restaurantId, Guid tableId, DateTime? billRequestedAt) => Task.CompletedTask;
    }
}
