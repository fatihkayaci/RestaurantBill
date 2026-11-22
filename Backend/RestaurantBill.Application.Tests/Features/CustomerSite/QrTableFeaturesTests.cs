using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Features.Categories;
using RestaurantBill.Application.Features.Categories.Commands.UpdateCategory;
using RestaurantBill.Application.Features.Categories.Queries.GetAllCategories;
using RestaurantBill.Application.Features.CustomerSite;
using RestaurantBill.Application.Features.CustomerSite.Public;
using RestaurantBill.Application.Features.CustomerSite.Staff;
using RestaurantBill.Application.Features.Orders.Commands.TransferOrder;
using RestaurantBill.Application.Features.Orders.Queries;
using RestaurantBill.Application.Features.Products.Commands.CreateProduct;
using RestaurantBill.Application.Features.Products.Commands.UpdateProduct;
using RestaurantBill.Application.Features.Tables.Queries.GetAllTable;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.CustomerSite;

// QR masa menüsü özellikleri (arka uç): sipariş aşaması, nedenli garson çağrısı, hesap tercihi, alerjenler, kategori
// servis penceresi ve masadaki diğer bekleyen siparişler.
public class QrTableFeaturesTests : ApplicationTestBase
{
    private const string Slug = "ozellik-restoran";
    private static readonly string OtherHash = QrTableAccess.HashToken("baska-telefon-000000002")!;

    private readonly FakeTenantResolver _tenant = new() { Slug = Slug };
    private readonly FakeTableNotificationService _tableNotifications = new();
    private readonly FakeCashierNotificationService _cashierNotifications = new();
    private readonly ManualClock _clock = new();
    private readonly TableActionCooldown _cooldown;

    private Branch _branch = default!;
    private Table _table = default!;
    private Product _product = default!;
    private Category _category = default!;

    public QrTableFeaturesTests()
    {
        _cooldown = new TableActionCooldown(_clock);
    }

    private sealed class ManualClock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = DateTimeOffset.UtcNow;
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private async Task SeedAsync()
    {
        User owner = await SeedActorAsync("Yönetici");
        Company company = Company.Create("Özellik Restoran", owner);
        company.Slug = Slug;
        DbContext.Companies.Add(company);
        await DbContext.SaveChangesAsync();

        _branch = Branch.Create(company.Id, "Merkez", "", "", "", "İstanbul", "Fatih", "", 10m);
        SetId(_branch, CurrentUser.BranchId);
        DbContext.Branches.Add(_branch);
        await DbContext.SaveChangesAsync();

        _table = await SeedTableAsync();
        _category = await DbContext.Categories.FindAsync(await DefaultCategoryIdAsync()) ?? throw new InvalidOperationException();
        _product = Product.Create("Lahmacun", 150m, "", _category.Id);
        DbContext.Products.Add(_product);
        await DbContext.SaveChangesAsync();
    }

    private Task<Result<OrderRequestStatusDto>> SendAsync(string deviceHash, Guid? productId = null, int quantity = 1)
        => new CreateOrderRequestCommandHandler(Db, _tenant, new OrderPricingService(Db), _tableNotifications, _clock).Handle(new CreateOrderRequestCommand
        {
            DeviceTokenHash = deviceHash,
            TableId = _table.Id,
            Items = [new OrderRequestItemInput { ProductId = productId ?? _product.Id, Quantity = quantity }]
        }, CancellationToken.None);

    private async Task<Guid> SendAndApproveAsync(string deviceHash)
    {
        var sent = await SendAsync(deviceHash);
        Assert.True(sent.IsSuccess, sent.Error);
        var approved = await new ApproveOrderRequestCommandHandler(Db, CurrentUser, _tableNotifications, _cashierNotifications)
            .Handle(new ApproveOrderRequestCommand { Id = sent.Value!.Id }, CancellationToken.None);
        Assert.True(approved.IsSuccess, approved.Error);
        return sent.Value.Id;
    }

    private async Task<string> StageAsync(Guid requestId)
    {
        var status = await new GetOrderRequestStatusQueryHandler(Db, _tenant)
            .Handle(new GetOrderRequestStatusQuery { Id = requestId }, CancellationToken.None);
        Assert.True(status.IsSuccess, status.Error);
        return status.Value!.Stage;
    }

    private Order OpenOrder(Guid? tableId = null)
        => DbContext.Orders.Include(o => o.OrderItems)
            .Single(o => o.TableId == (tableId ?? _table.Id) && o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled);

    // ── 1. Sipariş aşaması ──────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Stage_FollowsTheKitchen_FromSentToServed()
    {
        await SeedAsync();
        var sent = await SendAsync(DeviceHash);
        Assert.Equal("Sent", sent.Value!.Stage);
        Assert.Equal("Sent", await StageAsync(sent.Value.Id));

        var approved = await new ApproveOrderRequestCommandHandler(Db, CurrentUser, _tableNotifications, _cashierNotifications)
            .Handle(new ApproveOrderRequestCommand { Id = sent.Value.Id }, CancellationToken.None);
        Assert.True(approved.IsSuccess, approved.Error);
        Assert.Equal("Approved", await StageAsync(sent.Value.Id));

        Order order = OpenOrder();
        Assert.All(order.OrderItems, i => Assert.Equal(sent.Value.Id, i.OrderRequestId));

        order.UpdateStatus(OrderStatus.Preparing);
        await DbContext.SaveChangesAsync();
        Assert.Equal("Preparing", await StageAsync(sent.Value.Id));

        // Mutfak "Hazır" deyince garson düğmesi beklenmeden "Masanıza geliyor".
        order.UpdateStatus(OrderStatus.Ready);
        await DbContext.SaveChangesAsync();
        Assert.Equal("OnTheWay", await StageAsync(sent.Value.Id));

        order.UpdateStatus(OrderStatus.Served);
        await DbContext.SaveChangesAsync();
        Assert.Equal("Served", await StageAsync(sent.Value.Id));
    }

    [Fact]
    public async Task Stage_UsesOnlyTheRequestsOwnItems()
    {
        await SeedAsync();
        Guid first = await SendAndApproveAsync(DeviceHash);
        Order order = OpenOrder();
        order.UpdateStatus(OrderStatus.Ready);
        await DbContext.SaveChangesAsync();

        // İkinci talep aynı ürünü ekler: ayrı satır olur, ilk talep "geliyor" kalır.
        Guid second = await SendAndApproveAsync(OtherHash);

        Assert.Equal("OnTheWay", await StageAsync(first));
        Assert.Equal("Approved", await StageAsync(second));
        Assert.Equal(2, OpenOrder().OrderItems.Count);
    }

    [Fact]
    public async Task Stage_LegacyRequestWithoutItemLink_FallsBackToApproved()
    {
        await SeedAsync();
        Guid id = await SendAndApproveAsync(DeviceHash);
        // Eski kayıt: kalemlerde talep bağı yok, talepte ItemsLinked false.
        foreach (OrderItem item in OpenOrder().OrderItems)
            DbContext.Entry(item).Property(nameof(OrderItem.OrderRequestId)).CurrentValue = null;
        DbContext.Entry(DbContext.OrderRequests.Single(r => r.Id == id)).Property(nameof(OrderRequest.ItemsLinked)).CurrentValue = false;
        await DbContext.SaveChangesAsync();

        Assert.Equal("Approved", await StageAsync(id));
    }

    [Fact]
    public async Task RequestLink_SurvivesTableMoveAndMerge()
    {
        await SeedAsync();
        Guid requestId = await SendAndApproveAsync(DeviceHash);

        Table moved = await SeedTableAsync();
        var move = await new TransferOrderCommandHandler(Db, new OrderQueries(Db), _tableNotifications, _cashierNotifications, CurrentUser)
            .Handle(new TransferOrderCommand { SourceTableId = _table.Id, DestinationTableId = moved.Id, Mode = TableTransferMode.Move }, CancellationToken.None);
        Assert.True(move.IsSuccess, move.Error);
        Assert.All(OpenOrder(moved.Id).OrderItems, i => Assert.Equal(requestId, i.OrderRequestId));

        Table destination = await SeedTableAsync();
        destination.Occupy();
        Order target = Order.Create(destination.Id, CurrentUser.BranchId);
        target.AddItem(_product, 1, _product.GetEffectiveTaxRate());
        DbContext.Orders.Add(target);
        await DbContext.SaveChangesAsync();

        var merge = await new TransferOrderCommandHandler(Db, new OrderQueries(Db), _tableNotifications, _cashierNotifications, CurrentUser)
            .Handle(new TransferOrderCommand { SourceTableId = moved.Id, DestinationTableId = destination.Id, Mode = TableTransferMode.Merge }, CancellationToken.None);
        Assert.True(merge.IsSuccess, merge.Error);

        Order merged = OpenOrder(destination.Id);
        // Garsonun satırıyla birleşmedi; talebin satırı bağıyla taşındı.
        Assert.Single(merged.OrderItems, i => i.OrderRequestId == requestId);
        Assert.Single(merged.OrderItems, i => i.OrderRequestId is null);

        merged.UpdateStatus(OrderStatus.Ready);
        await DbContext.SaveChangesAsync();
        Assert.Equal("OnTheWay", await StageAsync(requestId));
    }

    // ── 2. Nedenli garson çağrısı ───────────────────────────────────────────────────────────────

    private Task<Result<TableActionResultDto>> CallAsync(WaiterCallReason? reason, string? note = null)
        => new CallWaiterCommandHandler(Db, _tenant, _tableNotifications, _cooldown, _clock)
            .Handle(new CallWaiterCommand { TableId = _table.Id, Reason = reason, Note = note }, CancellationToken.None);

    [Fact]
    public async Task CallWaiter_SendsReason_AndNoteOnlyForOther()
    {
        await SeedAsync();

        Assert.True((await CallAsync(WaiterCallReason.Water, "yok sayılır")).Value!.Sent);
        WaiterCalledDto water = _tableNotifications.WaiterCallsSent.Last().Payload;
        Assert.Equal(WaiterCallReason.Water, water.Reason);
        Assert.Null(water.Note);

        _clock.Now += TableActionCooldown.Window;
        Assert.True((await CallAsync(WaiterCallReason.Other, "  Bebek\n sandalyesi\t ")).Value!.Sent);
        WaiterCalledDto other = _tableNotifications.WaiterCallsSent.Last().Payload;
        Assert.Equal(WaiterCallReason.Other, other.Reason);
        Assert.Equal("Bebek sandalyesi", other.Note);
    }

    [Fact]
    public async Task CallWaiter_CooldownIsPerTable_AcrossReasons()
    {
        await SeedAsync();
        Assert.True((await CallAsync(WaiterCallReason.Water)).Value!.Sent);

        var second = await CallAsync(WaiterCallReason.Cutlery);
        Assert.False(second.Value!.Sent);
        Assert.InRange(second.Value.RetryAfterSeconds, 1, 60);
        Assert.Single(_tableNotifications.WaiterCallsSent);

        _clock.Now += TimeSpan.FromSeconds(60);
        Assert.True((await CallAsync(WaiterCallReason.Cutlery)).Value!.Sent);
    }

    [Fact]
    public void CallWaiterValidator_RejectsLongNoteAndUnknownReason()
    {
        var validator = new CallWaiterCommandValidator();
        Guid tableId = Guid.NewGuid();

        Assert.True(validator.Validate(new CallWaiterCommand { TableId = tableId, Reason = WaiterCallReason.Other, Note = new string('a', 100) }).IsValid);
        // Kontrol karakterleri sayılmaz.
        Assert.True(validator.Validate(new CallWaiterCommand { TableId = tableId, Reason = WaiterCallReason.Other, Note = new string('a', 100) + "\n\n" }).IsValid);
        Assert.False(validator.Validate(new CallWaiterCommand { TableId = tableId, Reason = WaiterCallReason.Other, Note = new string('a', 101) }).IsValid);
        Assert.False(validator.Validate(new CallWaiterCommand { TableId = tableId, Reason = (WaiterCallReason)9 }).IsValid);
        // Eski istemci: neden yok.
        Assert.True(validator.Validate(new CallWaiterCommand { TableId = tableId }).IsValid);
    }

    // ── 3. Hesap isteğinde ödeme tercihi ────────────────────────────────────────────────────────

    private Task<Result<TableActionResultDto>> RequestBillAsync(BillPaymentHint? hint, int? split)
        => new RequestTableBillCommandHandler(Db, _tenant, _tableNotifications, _cashierNotifications, _cooldown, _clock)
            .Handle(new RequestTableBillCommand { TableId = _table.Id, PaymentHint = hint, SplitCount = split }, CancellationToken.None);

    [Fact]
    public async Task RequestBill_StoresHint_InPayloadsAndTableDto_LastRequestWins()
    {
        await SeedAsync();
        await SendAndApproveAsync(DeviceHash);

        Assert.True((await RequestBillAsync(BillPaymentHint.Card, 3)).Value!.Sent);
        Order order = OpenOrder();
        Assert.Equal(BillPaymentHint.Card, order.BillPaymentHint);
        Assert.Equal(3, order.BillSplitCount);

        BillRequestHintDto? cashierHint = _cashierNotifications.BillRequestHints.Last();
        Assert.Equal(BillPaymentHint.Card, cashierHint!.PaymentHint);
        Assert.Equal(3, cashierHint.SplitCount);
        Assert.Equal(150m, cashierHint.Remaining);
        WaiterCalledDto waiterPayload = _tableNotifications.CustomerBillRequestsSent.Last().Payload;
        Assert.Equal(BillPaymentHint.Card, waiterPayload.PaymentHint);
        Assert.Equal(3, waiterPayload.SplitCount);

        var tables = await new GetAllTableQueryHandler(Db, CurrentUser).Handle(new GetAllTableQuery(), CancellationToken.None);
        TableDto dto = tables.Value!.Single(t => t.Id == _table.Id);
        Assert.Equal(BillPaymentHint.Card, dto.BillPaymentHint);
        Assert.Equal(3, dto.BillSplitCount);

        _clock.Now += TableActionCooldown.Window;
        Assert.True((await RequestBillAsync(BillPaymentHint.Cash, null)).Value!.Sent);
        Assert.Equal(BillPaymentHint.Cash, OpenOrder().BillPaymentHint);
        Assert.Null(OpenOrder().BillSplitCount);
    }

    [Fact]
    public void RequestBillValidator_RejectsSplitOutOfRange()
    {
        var validator = new RequestTableBillCommandValidator();
        Guid tableId = Guid.NewGuid();
        Assert.True(validator.Validate(new RequestTableBillCommand { TableId = tableId, SplitCount = 2 }).IsValid);
        Assert.True(validator.Validate(new RequestTableBillCommand { TableId = tableId, SplitCount = 20 }).IsValid);
        Assert.False(validator.Validate(new RequestTableBillCommand { TableId = tableId, SplitCount = 1 }).IsValid);
        Assert.False(validator.Validate(new RequestTableBillCommand { TableId = tableId, SplitCount = 21 }).IsValid);
        Assert.False(validator.Validate(new RequestTableBillCommand { TableId = tableId, PaymentHint = (BillPaymentHint)7 }).IsValid);
    }

    // ── 4. Alerjen / diyet etiketleri ───────────────────────────────────────────────────────────

    private GetPublicSiteQueryHandler SiteHandler()
        => new(Db, _tenant, Options.Create(new BunnyStorageOptions { CdnBaseUrl = "https://cdn.test" }));

    [Fact]
    public async Task Allergens_PersistThroughCreateAndUpdate_AndReachThePublicMenu()
    {
        await SeedAsync();
        var created = await new CreateProductCommandHandler(Db, CurrentUser).Handle(new CreateProductCommand
        {
            Name = "Fıstıklı Baklava",
            Price = 200m,
            CategoryId = _category.Id,
            IsActive = true,
            Allergens = (int)(ProductAllergen.Gluten | ProductAllergen.TreeNuts | ProductAllergen.Milk),
            DietTags = (int)ProductDietTag.Vegetarian,
        }, CancellationToken.None);
        Assert.True(created.IsSuccess, created.Error);

        Product baklava = DbContext.Products.Single(p => p.Name == "Fıstıklı Baklava");
        Assert.Equal(ProductAllergen.Gluten | ProductAllergen.TreeNuts | ProductAllergen.Milk, baklava.Allergens);

        // Alanları göndermeyen (eski) istemci etiketleri silmez.
        var untouched = await new UpdateProductCommandHandler(Db, CurrentUser).Handle(new UpdateProductCommand
        {
            Id = baklava.Id, Name = baklava.Name, Price = 210m, CategoryId = _category.Id, IsActive = true,
        }, CancellationToken.None);
        Assert.True(untouched.IsSuccess, untouched.Error);
        Assert.Equal(ProductDietTag.Vegetarian, DbContext.Products.Single(p => p.Id == baklava.Id).DietTags);

        var updated = await new UpdateProductCommandHandler(Db, CurrentUser).Handle(new UpdateProductCommand
        {
            Id = baklava.Id, Name = baklava.Name, Price = 210m, CategoryId = _category.Id, IsActive = true,
            DietTags = (int)(ProductDietTag.Vegetarian | ProductDietTag.Halal),
        }, CancellationToken.None);
        Assert.True(updated.IsSuccess, updated.Error);

        var site = await SiteHandler().Handle(new GetPublicSiteQuery(), CancellationToken.None);
        Assert.True(site.IsSuccess, site.Error);
        PublicProductDto dto = site.Value!.Categories.SelectMany(c => c.Products).Single(p => p.Id == baklava.Id);
        Assert.Equal((int)(ProductAllergen.Gluten | ProductAllergen.TreeNuts | ProductAllergen.Milk), dto.Allergens);
        Assert.Equal((int)(ProductDietTag.Vegetarian | ProductDietTag.Halal), dto.DietTags);
    }

    [Fact]
    public void ProductValidator_RejectsUnknownFlags()
    {
        var validator = new CreateProductCommandValidator();
        var ok = new CreateProductCommand { Name = "Ayran", Price = 30m, CategoryId = Guid.NewGuid(), Allergens = (int)ProductAllergen.Milk };
        Assert.True(validator.Validate(ok).IsValid);
        ok.Allergens = 1 << 20;
        Assert.False(validator.Validate(ok).IsValid);
    }

    [Fact]
    public async Task SetMenu_PublicDto_UnionsAllergens_AndKeepsClaimsOnlyIfAllOptionsHaveThem()
    {
        await SeedAsync();
        Product adana = Product.Create("Adana", 300m, "", _category.Id);
        adana.SetDietaryInfo(ProductAllergen.None, ProductDietTag.Halal | ProductDietTag.Spicy);
        Product ayran = Product.Create("Ayran", 30m, "", _category.Id);
        ayran.SetDietaryInfo(ProductAllergen.Milk, ProductDietTag.Halal | ProductDietTag.Vegetarian);
        Product salgam = Product.Create("Şalgam", 30m, "", _category.Id);
        salgam.SetDietaryInfo(ProductAllergen.Mustard, ProductDietTag.Halal | ProductDietTag.Vegan | ProductDietTag.Vegetarian);
        DbContext.Products.AddRange(adana, ayran, salgam);
        await DbContext.SaveChangesAsync();

        SetMenu menu = SetMenu.Create(_branch.Id, "Adana Menü");
        menu.SetContents([
            new SetMenuSlotDraft("Ana yemek", [new SetMenuOptionDraft(adana, false)]),
            new SetMenuSlotDraft("İçecek", [new SetMenuOptionDraft(ayran, true), new SetMenuOptionDraft(salgam, false)]),
        ], DiscountType.None, 0m);
        DbContext.SetMenus.Add(menu);
        await DbContext.SaveChangesAsync();

        var site = await SiteHandler().Handle(new GetPublicSiteQuery(), CancellationToken.None);
        Assert.True(site.IsSuccess, site.Error);
        var dto = site.Value!.SetMenus.Single();
        Assert.Equal((int)(ProductAllergen.Milk | ProductAllergen.Mustard), dto.Allergens);
        // Helal hepsinde var; Acılı birinde var (bilgi); vegan/vejetaryen Adana'da yok.
        Assert.Equal((int)(ProductDietTag.Halal | ProductDietTag.Spicy), dto.DietTags);
        Assert.Equal((int)ProductAllergen.Milk, dto.Slots.Single(s => s.Name == "İçecek").Options.Single(o => o.ProductName == "Ayran").Allergens);
    }

    // ── 5. Kategori servis penceresi ────────────────────────────────────────────────────────────

    // Şube Europe/Istanbul (UTC+3): yerel 22:00 = 19:00 UTC.
    private void SetUtc(int hour, int minute = 0) => _clock.Now = new DateTimeOffset(2026, 11, 20, hour, minute, 0, TimeSpan.Zero);

    [Fact]
    public async Task CreateOrderRequest_RejectsCategoryOutsideItsWindow_InBranchTimeZone()
    {
        await SeedAsync();
        _category.SetAvailability(null, null, new TimeOnly(22, 0));
        await DbContext.SaveChangesAsync();

        SetUtc(18, 30); // İstanbul 21:30
        Assert.True((await SendAsync(DeviceHash)).IsSuccess);

        SetUtc(19, 30); // İstanbul 22:30 (UTC'de hâlâ 22:00'den önce)
        var late = await SendAsync(DeviceHash);
        Assert.False(late.IsSuccess);
        Assert.Contains("Lahmacun şu an servis edilmiyor", late.Error);
        Assert.Contains("22:00'ye kadar", late.Error);
    }

    [Fact]
    public async Task PendingRequest_CanStillBeApproved_AfterTheWindowCloses()
    {
        await SeedAsync();
        _category.SetAvailability(null, null, new TimeOnly(22, 0));
        await DbContext.SaveChangesAsync();
        SetUtc(18, 30);
        var sent = await SendAsync(DeviceHash);
        Assert.True(sent.IsSuccess, sent.Error);

        SetUtc(20, 0);
        var approved = await new ApproveOrderRequestCommandHandler(Db, CurrentUser, _tableNotifications, _cashierNotifications)
            .Handle(new ApproveOrderRequestCommand { Id = sent.Value!.Id }, CancellationToken.None);
        Assert.True(approved.IsSuccess, approved.Error);
    }

    [Fact]
    public async Task CategoryUpdate_SavesWindow_AndStaffListShowsItWithoutBlocking()
    {
        await SeedAsync();
        var update = await new UpdateCategoryCommandHandler(Db, CurrentUser).Handle(new UpdateCategoryCommand
        {
            Id = _category.Id,
            Name = _category.Name,
            Availability = new CategoryAvailabilityInput { Days = Category.WeekdaysMask, From = "08:00", Until = "12:00" },
        }, CancellationToken.None);
        Assert.True(update.IsSuccess, update.Error);

        var list = await new GetAllCategoryQueryHandler(Db, CurrentUser).Handle(new GetAllCategoryQuery(), CancellationToken.None);
        CategoryDto dto = list.Value!.Single(c => c.Id == _category.Id);
        Assert.Equal(Category.WeekdaysMask, dto.AvailableDays);
        Assert.Equal("08:00", dto.AvailableFrom);
        Assert.Equal("12:00", dto.AvailableUntil);
        Assert.Equal("Hafta içi 08:00–12:00", dto.AvailabilityLabel);

        // "Her zaman": boş pencere.
        var clear = await new UpdateCategoryCommandHandler(Db, CurrentUser).Handle(new UpdateCategoryCommand
        {
            Id = _category.Id, Name = _category.Name, Availability = new CategoryAvailabilityInput(),
        }, CancellationToken.None);
        Assert.True(clear.IsSuccess, clear.Error);
        Assert.False(DbContext.Categories.Single(c => c.Id == _category.Id).HasAvailabilityWindow);
    }

    [Fact]
    public void CategoryAvailabilityValidator_RejectsBadTimes()
    {
        var validator = new CategoryAvailabilityInputValidator();
        Assert.True(validator.Validate(new CategoryAvailabilityInput { From = "22:00", Until = "02:00" }).IsValid);
        Assert.False(validator.Validate(new CategoryAvailabilityInput { From = "25:00" }).IsValid);
        Assert.False(validator.Validate(new CategoryAvailabilityInput { From = "10:00", Until = "10:00" }).IsValid);
        Assert.False(validator.Validate(new CategoryAvailabilityInput { Days = 0 }).IsValid);
    }

    [Fact]
    public async Task PublicSite_ReportsAvailableNowAndLabel()
    {
        await SeedAsync();
        _category.SetAvailability(null, new TimeOnly(18, 0), null);
        await DbContext.SaveChangesAsync();

        var site = await SiteHandler().Handle(new GetPublicSiteQuery(), CancellationToken.None);
        PublicCategoryDto dto = site.Value!.Categories.Single(c => c.Id == _category.Id);
        Assert.Equal("18:00'den itibaren", dto.AvailabilityLabel);
        DateTime local = CategoryAvailability.LocalNow(_branch.TimeZoneId, DateTime.UtcNow);
        Assert.Equal(local.Hour >= 18, dto.AvailableNow);
    }

    // ── 6. Masadaki diğer bekleyen siparişler ───────────────────────────────────────────────────

    private async Task<PublicTableBillDto> BillAsync(string? deviceHash)
    {
        var result = await new GetTableBillQueryHandler(Db, _tenant, _clock)
            .Handle(new GetTableBillQuery { TableId = _table.Id, DeviceTokenHash = deviceHash }, CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);
        return result.Value!;
    }

    [Fact]
    public async Task PendingRequests_ShowCountsAndMine_WithoutProductNames()
    {
        await SeedAsync();
        Assert.True((await SendAsync(DeviceHash, quantity: 2)).IsSuccess);
        Assert.True((await SendAsync(OtherHash, quantity: 3)).IsSuccess);

        PublicTableBillDto bill = await BillAsync(DeviceHash);
        Assert.Equal(2, bill.PendingRequests.Count);
        Assert.Contains(bill.PendingRequests, p => p.IsMine && p.ItemCount == 2);
        Assert.Contains(bill.PendingRequests, p => !p.IsMine && p.ItemCount == 3);
    }

    [Fact]
    public async Task PendingRequests_WithoutOpenBill_HideAfter30Minutes()
    {
        await SeedAsync();
        Assert.True((await SendAsync(OtherHash)).IsSuccess);
        Assert.Single((await BillAsync(DeviceHash)).PendingRequests);

        _clock.Now = DateTimeOffset.UtcNow + GetTableBillQueryHandler.PendingRequestsVisibleFor + TimeSpan.FromMinutes(1);
        Assert.Empty((await BillAsync(DeviceHash)).PendingRequests);
    }

    [Fact]
    public async Task PendingRequests_WithOpenBill_StayVisibleBeyond30Minutes()
    {
        await SeedAsync();
        await SendAndApproveAsync(DeviceHash);
        Assert.True((await SendAsync(OtherHash)).IsSuccess);

        _clock.Now = DateTimeOffset.UtcNow + TimeSpan.FromHours(1);
        PublicTableBillDto bill = await BillAsync(DeviceHash);
        Assert.True(bill.HasBill);
        Assert.Single(bill.PendingRequests);
        Assert.False(bill.PendingRequests[0].IsMine);
    }
}
