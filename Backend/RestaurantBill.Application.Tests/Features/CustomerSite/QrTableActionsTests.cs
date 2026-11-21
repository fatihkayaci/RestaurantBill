using Microsoft.Extensions.Caching.Memory;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Features.Branches.QrMenu;
using RestaurantBill.Application.Features.CustomerSite;
using RestaurantBill.Application.Features.CustomerSite.Public;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.CustomerSite;

// Masa QR karşılama ekranı: "Garson çağır", "Hesap iste", sipariş anahtarı ve admin "QR menü özellikleri".
public class QrTableActionsTests : ApplicationTestBase
{
    private const string Slug = "qr-restoran";

    private readonly FakeTenantResolver _tenant = new() { Slug = Slug };
    private readonly FakeTableNotificationService _tableNotifications = new();
    private readonly FakeCashierNotificationService _cashierNotifications = new();
    private readonly ManualClock _clock = new();
    private readonly TableActionCooldown _cooldown;

    public QrTableActionsTests()
    {
        _cooldown = new TableActionCooldown(_clock);
    }

    private sealed class ManualClock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2026, 11, 14, 12, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    // Şirket (slug) → şube (CurrentUser.BranchId) → bölge → masa. features null: şubede hiç kaydedilmemiş.
    private async Task<(Branch Branch, Table Table)> SeedAsync(QrFeatures? features = null)
    {
        User owner = await SeedActorAsync("Yönetici");
        Company company = Company.Create("QR Restoran", owner);
        company.Slug = Slug;
        DbContext.Companies.Add(company);
        await DbContext.SaveChangesAsync();

        Branch branch = Branch.Create(company.Id, "Merkez", "", "", "", "İstanbul", "Fatih", "", 10m);
        SetId(branch, CurrentUser.BranchId);
        branch.SetQrFeatures(features);
        DbContext.Branches.Add(branch);
        await DbContext.SaveChangesAsync();

        return (branch, await SeedTableAsync());
    }

    private static QrFeatures AllOnExcept(bool ordering = true, bool callWaiter = true, bool billRequest = true)
        => QrFeatures.Create(ordering, callWaiter, billRequest, deliveryLinkEnabled: true, reservationLinkEnabled: true);

    private Task<Result<TableActionResultDto>> CallWaiterAsync(Guid tableId)
        => new CallWaiterCommandHandler(Db, _tenant, _tableNotifications, _cooldown, _clock)
            .Handle(new CallWaiterCommand { TableId = tableId }, CancellationToken.None);

    private Task<Result<TableActionResultDto>> RequestBillAsync(Guid tableId)
        => new RequestTableBillCommandHandler(Db, _tenant, _tableNotifications, _cashierNotifications, _cooldown, _clock)
            .Handle(new RequestTableBillCommand { TableId = tableId }, CancellationToken.None);

    private async Task<Order> SeedOpenOrderAsync(Table table)
    {
        Order order = Order.Create(table.Id, CurrentUser.BranchId);
        DbContext.Orders.Add(order);
        await DbContext.SaveChangesAsync();
        return order;
    }

    // ── Varsayılanlar ───────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetPublicTable_WithoutSavedQrFeatures_ReturnsAllEnabled()
    {
        var (branch, table) = await SeedAsync();
        Assert.Null(branch.QrFeatures);

        var result = await new GetPublicTableQueryHandler(Db, _tenant, new MemoryCache(new MemoryCacheOptions()), TimeProvider.System)
            .Handle(new GetPublicTableQuery { TableId = table.Id }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        QrFeaturesDto features = result.Value!.QrFeatures;
        Assert.True(features.OrderingEnabled);
        Assert.True(features.CallWaiterEnabled);
        Assert.True(features.BillRequestEnabled);
        Assert.True(features.DeliveryLinkEnabled);
        Assert.True(features.ReservationLinkEnabled);
        // Online sipariş hiç ayarlanmamış: varsayılanı kapalı, paket servis bağlantısı yine görünmez.
        Assert.False(result.Value.AcceptsOnlineOrders);
    }

    [Fact]
    public async Task GetPublicTable_ReturnsSavedQrFeatures()
    {
        var (_, table) = await SeedAsync(QrFeatures.Create(false, true, false, true, false));

        var result = await new GetPublicTableQueryHandler(Db, _tenant, new MemoryCache(new MemoryCacheOptions()), TimeProvider.System)
            .Handle(new GetPublicTableQuery { TableId = table.Id }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.False(result.Value!.QrFeatures.OrderingEnabled);
        Assert.True(result.Value.QrFeatures.CallWaiterEnabled);
        Assert.False(result.Value.QrFeatures.BillRequestEnabled);
        Assert.True(result.Value.QrFeatures.DeliveryLinkEnabled);
        Assert.False(result.Value.QrFeatures.ReservationLinkEnabled);
        // Yeni bölüm anahtarları verilmezse varsayılan: öne çıkanlar açık, popüler kapalı.
        Assert.True(result.Value.QrFeatures.FeaturedSectionEnabled);
        Assert.False(result.Value.QrFeatures.PopularSectionEnabled);
        Assert.Empty(result.Value.PopularProductIds);
    }

    [Fact]
    public async Task AdminUpdate_SavesFeatures_AndGetReturnsThem()
    {
        var (_, _) = await SeedAsync();

        var update = await new UpdateBranchQrFeaturesCommandHandler(Db, CurrentUser).Handle(new UpdateBranchQrFeaturesCommand
        {
            OrderingEnabled = false,
            CallWaiterEnabled = true,
            BillRequestEnabled = false,
            DeliveryLinkEnabled = false,
            ReservationLinkEnabled = true,
            FeaturedSectionEnabled = false,
            PopularSectionEnabled = true,
        }, CancellationToken.None);
        Assert.True(update.IsSuccess, update.Error);

        var get = await new GetBranchQrFeaturesQueryHandler(Db, CurrentUser).Handle(new GetBranchQrFeaturesQuery(), CancellationToken.None);

        Assert.True(get.IsSuccess, get.Error);
        Assert.False(get.Value!.OrderingEnabled);
        Assert.True(get.Value.CallWaiterEnabled);
        Assert.False(get.Value.BillRequestEnabled);
        Assert.False(get.Value.DeliveryLinkEnabled);
        Assert.True(get.Value.ReservationLinkEnabled);
        Assert.False(get.Value.FeaturedSectionEnabled);
        Assert.True(get.Value.PopularSectionEnabled);
        Assert.Contains(DbContext.AuditLogs, a => a.Action == "BranchQrFeaturesUpdated" && a.Message.Contains("popüler ürünler açık"));
    }

    // ── Sipariş anahtarı ────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateOrderRequest_WhenOrderingDisabled_IsRejected()
    {
        var (_, table) = await SeedAsync(AllOnExcept(ordering: false));
        Product product = Product.Create("Mercimek Çorbası", 120m, "", await DefaultCategoryIdAsync());
        DbContext.Products.Add(product);
        await DbContext.SaveChangesAsync();

        var result = await new CreateOrderRequestCommandHandler(Db, _tenant, new OrderPricingService(Db), _tableNotifications).Handle(new CreateOrderRequestCommand
        {
            DeviceTokenHash = DeviceHash,
            TableId = table.Id,
            Items = [new OrderRequestItemInput { ProductId = product.Id, Quantity = 1 }]
        }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(CustomerSiteScope.OrderingDisabledMessage, result.Error);
        Assert.Empty(DbContext.OrderRequests);
        Assert.Equal(0, _tableNotifications.CustomerRequestsChangedCount);
    }

    // ── Garson çağır ────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CallWaiter_NotifiesTableWaiters_WithTableAndRegion()
    {
        var (branch, table) = await SeedAsync();

        var result = await CallWaiterAsync(table.Id);

        Assert.True(result.IsSuccess, result.Error);
        Assert.True(result.Value!.Sent);
        Assert.Equal(60, result.Value.RetryAfterSeconds);
        var (branchId, payload) = Assert.Single(_tableNotifications.WaiterCallsSent);
        Assert.Equal(branch.Id, branchId);
        Assert.Equal(table.Id, payload.TableId);
        Assert.Equal(table.RegionId, payload.RegionId);
        Assert.Equal(table.Name, payload.TableName);
        Assert.Equal("Salon", payload.RegionName);
    }

    [Fact]
    public async Task CallWaiter_SecondCallWithinCooldown_IsNotSentAgain_UntilWindowPasses()
    {
        var (_, table) = await SeedAsync();
        Assert.True((await CallWaiterAsync(table.Id)).Value!.Sent);

        _clock.Now = _clock.Now.AddSeconds(20);
        var again = await CallWaiterAsync(table.Id);

        Assert.True(again.IsSuccess, again.Error);
        Assert.False(again.Value!.Sent);
        Assert.Equal(40, again.Value.RetryAfterSeconds);
        Assert.Single(_tableNotifications.WaiterCallsSent);

        _clock.Now = _clock.Now.AddSeconds(41);
        var later = await CallWaiterAsync(table.Id);

        Assert.True(later.Value!.Sent);
        Assert.Equal(2, _tableNotifications.WaiterCallsSent.Count);
    }

    [Fact]
    public async Task CallWaiter_CooldownIsPerTable()
    {
        var (_, table) = await SeedAsync();
        Table other = await SeedTableAsync();

        Assert.True((await CallWaiterAsync(table.Id)).Value!.Sent);
        Assert.True((await CallWaiterAsync(other.Id)).Value!.Sent);

        Assert.Equal(2, _tableNotifications.WaiterCallsSent.Count);
    }

    [Fact]
    public async Task CallWaiter_WhenDisabled_FailsWithoutNotifying()
    {
        var (_, table) = await SeedAsync(AllOnExcept(callWaiter: false));

        var result = await CallWaiterAsync(table.Id);

        Assert.False(result.IsSuccess);
        Assert.Equal(CustomerSiteScope.CallWaiterDisabledMessage, result.Error);
        Assert.Empty(_tableNotifications.WaiterCallsSent);
    }

    [Fact]
    public async Task CallWaiter_WithUnknownSlug_Fails()
    {
        var (_, table) = await SeedAsync();

        var result = await new CallWaiterCommandHandler(Db, new FakeTenantResolver { Slug = "baska" }, _tableNotifications, _cooldown, _clock)
            .Handle(new CallWaiterCommand { TableId = table.Id }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Empty(_tableNotifications.WaiterCallsSent);
    }

    // ── Hesap iste ──────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task RequestBill_WithActiveOrder_MarksBillRequested_AndFiresStaffAlerts()
    {
        var (branch, table) = await SeedAsync();
        Order order = await SeedOpenOrderAsync(table);

        var result = await RequestBillAsync(table.Id);

        Assert.True(result.IsSuccess, result.Error);
        Assert.True(result.Value!.Sent);
        Assert.Equal(_clock.Now.UtcDateTime, order.BillRequestedAt);
        Assert.Equal((table.Id, (DateTime?)_clock.Now.UtcDateTime), Assert.Single(_tableNotifications.BillRequestChanges));
        var sent = Assert.Single(_cashierNotifications.BillRequestsSent);
        Assert.Equal((branch.Id, table.Id, table.Name, RequestTableBillCommandHandler.RequestedByName), sent);
        // The table's waiters get their own alert (they are not on the cashier hub).
        var waiterAlert = Assert.Single(_tableNotifications.CustomerBillRequestsSent);
        Assert.Equal(branch.Id, waiterAlert.BranchId);
        Assert.Equal(table.Id, waiterAlert.Payload.TableId);
        Assert.Equal(table.RegionId, waiterAlert.Payload.RegionId);
        Assert.Contains(DbContext.AuditLogs, a => a.Action == "BillRequested" && a.ActorName == RequestTableBillCommandHandler.RequestedByName);
    }

    [Fact]
    public async Task RequestBill_SecondPressWithinCooldown_DoesNotAlertAgain()
    {
        var (_, table) = await SeedAsync();
        await SeedOpenOrderAsync(table);
        Assert.True((await RequestBillAsync(table.Id)).Value!.Sent);

        _clock.Now = _clock.Now.AddSeconds(5);
        var again = await RequestBillAsync(table.Id);

        Assert.True(again.IsSuccess, again.Error);
        Assert.False(again.Value!.Sent);
        Assert.Equal(55, again.Value.RetryAfterSeconds);
        Assert.Single(_cashierNotifications.BillRequestsSent);
    }

    [Fact]
    public async Task RequestBill_WithoutActiveOrder_Fails()
    {
        var (_, table) = await SeedAsync();
        Order cancelled = await SeedOpenOrderAsync(table);
        cancelled.Cancel();
        await DbContext.SaveChangesAsync();

        var result = await RequestBillAsync(table.Id);

        Assert.False(result.IsSuccess);
        Assert.Equal(RequestTableBillCommandHandler.NoOpenBillMessage, result.Error);
        Assert.Empty(_cashierNotifications.BillRequestsSent);
        Assert.Null(cancelled.BillRequestedAt);
    }

    [Fact]
    public async Task RequestBill_WithoutActiveOrder_DoesNotStartCooldown()
    {
        var (_, table) = await SeedAsync();
        Assert.False((await RequestBillAsync(table.Id)).IsSuccess);

        // Garson masayı açtı; müşteri hemen tekrar basabilmeli.
        await SeedOpenOrderAsync(table);
        var result = await RequestBillAsync(table.Id);

        Assert.True(result.Value!.Sent);
    }

    [Fact]
    public async Task RequestBill_WhenDisabled_FailsAndLeavesOrderUntouched()
    {
        var (_, table) = await SeedAsync(AllOnExcept(billRequest: false));
        Order order = await SeedOpenOrderAsync(table);

        var result = await RequestBillAsync(table.Id);

        Assert.False(result.IsSuccess);
        Assert.Equal(CustomerSiteScope.BillRequestDisabledMessage, result.Error);
        Assert.Null(order.BillRequestedAt);
        Assert.Empty(_cashierNotifications.BillRequestsSent);
        Assert.Empty(_tableNotifications.BillRequestChanges);
    }

    [Fact]
    public async Task CallWaiterAndBillRequest_HaveSeparateCooldowns()
    {
        var (_, table) = await SeedAsync();
        await SeedOpenOrderAsync(table);

        Assert.True((await CallWaiterAsync(table.Id)).Value!.Sent);
        Assert.True((await RequestBillAsync(table.Id)).Value!.Sent);
    }
}
