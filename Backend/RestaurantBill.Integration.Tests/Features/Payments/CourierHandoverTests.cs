using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.DTOs.Reports;
using RestaurantBill.Application.Features.Delivery.Staff;
using RestaurantBill.Application.Features.Reports.Queries.GetProductReport;
using RestaurantBill.Application.Features.Reports.Queries.GetSalesReport;
using RestaurantBill.Application.Features.Reports.Queries.GetTaxReport;
using RestaurantBill.Application.Features.Shifts.Queries.GetShiftSummary;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Infrastructure.Services;
using RestaurantBill.Integration.Tests.Infrastructure;

namespace RestaurantBill.Integration.Tests.Features.Payments;

// Kasiyerin "Teslim al"ı raporlara ödemeler üzerinden girer: vardiyanın beklenen nakdi teslim alınan nakit kadar artar,
// satış/vardiya/KDV raporları teslimat ücretini içerir, ürün raporu yalnızca ürünleri (satır kalemleri) sayar.
// Sipariş: 2 Lahmacun (₺100, %10 KDV) + ₺20 teslimat (şube oranı %8) = ₺220.
public class CourierHandoverTests : IntegrationTestBase
{
    private const decimal OpeningCash = 1000m;
    private const decimal BranchTaxRate = 8m;

    private readonly Product _lahmacun;
    private readonly CashRegister _register;
    private readonly Shift _shift;
    private readonly User _courier;

    public CourierHandoverTests()
    {
        User admin = User.Create("Şube Yöneticisi", "admin@test.com", "05000000001");
        DbContext.Users.Add(admin);
        DbContext.Entry(admin).Property(u => u.Id).CurrentValue = UserId;

        _courier = User.Create("Kurye Kaan", "kaan@test.com", "05000000002");
        DbContext.Users.Add(_courier);
        DbContext.SaveChanges();
        Branch branch = DbContext.Branches.Single(b => b.Id == RestaurantId);
        // Teslimat ücreti şubenin oranıyla yazılır; ürün oranından (%10) ayrı görünsün diye %8.
        branch.Update(branch.BranchName, "", "", "", "", "", "", BranchTaxRate);
        DbContext.UserBranches.Add(UserBranch.Create(_courier, branch, "kaan", null, UserRole.Courier));

        Category food = Category.Create("Pide", RestaurantId);
        DbContext.Categories.Add(food);
        DbContext.SaveChanges();

        _lahmacun = Product.Create("Lahmacun", 100m, "", food.Id);
        DbContext.Products.Add(_lahmacun);

        _register = CashRegister.Create("Ana Kasa", OpeningCash, RestaurantId);
        DbContext.CashRegisters.Add(_register);
        DbContext.SaveChanges();
        _shift = Shift.Create(RestaurantId, _register.Id, UserId, OpeningCash, OpeningCash);
        DbContext.Shifts.Add(_shift);
        DbContext.SaveChanges();
    }

    private async Task<DeliveryOrder> DeliveredAsync(PaymentMethod method)
    {
        DeliveryZone zone = DeliveryZone.Create(RestaurantId, "Moda", 20m, 0m, 30, 0);
        DbContext.DeliveryZones.Add(zone);
        await DbContext.SaveChangesAsync();

        DeliveryOrder delivery = DeliveryOrder.Create(RestaurantId, DbContext.DeliveryOrders.Count() + 1, Guid.NewGuid(), "Ayşe Kaya", "05551112233",
            "Moda Cad. 1", null, null, zone, method, null);
        delivery.AddProductLine(_lahmacun, 100m, 10m, 2, null);

        Order order = Order.CreateDelivery(RestaurantId, delivery.DeliveryFee);
        order.AddItemAtPrice(_lahmacun, 100m, 2, 10m);
        DbContext.Orders.Add(order);
        await DbContext.SaveChangesAsync();

        DateTime now = DateTime.UtcNow;
        delivery.Accept(order, 30, UserId, now);
        delivery.AdvanceFromKitchen(OrderStatus.Ready);
        delivery.AssignCourier(_courier.Id);
        delivery.Dispatch(now);
        delivery.Deliver(method, now);
        DbContext.DeliveryOrders.Add(delivery);
        await DbContext.SaveChangesAsync();
        return delivery;
    }

    private async Task HandoverAsync(params DeliveryOrder[] orders)
    {
        var result = await new HandoverCourierCashCommandHandler(AppDb, CurrentUser, new NullCashierNotificationService(),
                new NullCourierNotificationService(), TimeProvider.System)
            .Handle(new HandoverCourierCashCommand
            {
                CourierUserId = _courier.Id,
                CashRegisterId = _register.Id,
                DeliveryOrderIds = orders.Select(o => o.Id).ToList()
            }, CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);
    }

    private static (DateOnly From, DateOnly To) Range()
    {
        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);
        return (today.AddDays(-1), today.AddDays(1));
    }

    [Fact]
    public async Task CashHandover_ShiftExpectedCashAndSummary_IncludeTheCollectedTotal()
    {
        DeliveryOrder delivery = await DeliveredAsync(PaymentMethod.Nakit);

        await HandoverAsync(delivery);

        decimal expected = await new ShiftBalanceCalculator(AppDb).CalculateExpectedClosingBalanceAsync(_shift, CancellationToken.None);
        Assert.Equal(OpeningCash + 220m, expected);

        var summary = await new GetShiftSummaryQueryHandler(AppDb, CurrentUser, new ShiftBalanceCalculator(AppDb))
            .Handle(new GetShiftSummaryQuery { ShiftId = _shift.Id }, CancellationToken.None);
        Assert.True(summary.IsSuccess, summary.Error);
        Assert.Equal(220m, summary.Value!.Total);
        Assert.Equal(1, summary.Value.TransactionCount);
        ShiftPaymentBreakdownDto cash = Assert.Single(summary.Value.Breakdown);
        Assert.Equal(PaymentMethod.Nakit, cash.Method);
        Assert.Equal(220m, cash.Amount);
        Assert.Equal(OpeningCash + 220m, summary.Value.ExpectedCashInRegister);
    }

    [Fact]
    public async Task CardHandover_LeavesExpectedCashUnchanged()
    {
        DeliveryOrder delivery = await DeliveredAsync(PaymentMethod.Kart);

        await HandoverAsync(delivery);

        decimal expected = await new ShiftBalanceCalculator(AppDb).CalculateExpectedClosingBalanceAsync(_shift, CancellationToken.None);
        Assert.Equal(OpeningCash, expected);
    }

    [Fact]
    public async Task Reports_IncludeFeeInSalesAndTax_ButNotInProducts()
    {
        DeliveryOrder delivery = await DeliveredAsync(PaymentMethod.Nakit);
        await HandoverAsync(delivery);
        var (from, to) = Range();
        var scope = new ReportScopeResolver(AppDb, CurrentUser);

        var sales = await new GetSalesReportQueryHandler(AppDb, scope, new BusinessDayResolver())
            .Handle(new GetSalesReportQuery { From = from, To = to }, CancellationToken.None);
        Assert.Equal(220m, sales.Value!.TotalRevenue);
        Assert.Equal(20m, sales.Value.DeliveryFeeRevenue);
        Assert.Equal(1, sales.Value.TransactionCount);

        var tax = await new GetTaxReportQueryHandler(AppDb, scope, new BusinessDayResolver())
            .Handle(new GetTaxReportQuery { From = from, To = to }, CancellationToken.None);
        Assert.Equal(220m, tax.Value!.TotalAmount);
        Assert.Equal(200m, tax.Value.Rates.Single(r => r.TaxRatePercent == 10m).Total);
        TaxRateRowDto feeRate = tax.Value.Rates.Single(r => r.TaxRatePercent == BranchTaxRate);
        Assert.Equal(20m, feeRate.Total);
        Assert.Equal(18.52m, feeRate.Matrah);
        Assert.Equal(1.48m, feeRate.Tax);

        var products = await new GetProductReportQueryHandler(AppDb, scope, new BusinessDayResolver())
            .Handle(new GetProductReportQuery { From = from, To = to }, CancellationToken.None);
        var row = Assert.Single(products.Value!.Products);
        Assert.Equal(_lahmacun.Id, row.ProductId);
        Assert.Equal(2, row.Sold);
        Assert.Equal(200m, row.Revenue);
    }
}
