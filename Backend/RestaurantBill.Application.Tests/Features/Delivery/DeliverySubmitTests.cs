using System.Text.RegularExpressions;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Features.Delivery.Public;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.Delivery;

public class DeliverySubmitTests : DeliveryTestBase
{
    // ── Fiyatlandırma ───────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Quote_UsesServerPrices_AndAppliesZoneFeeAndMinimum()
    {
        await SeedAsync();

        var result = await QuoteHandler().Handle(new QuoteDeliveryOrderCommand { ZoneId = Moda.Id, Lines = [ProductLine(Lahmacun, 2)] }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        DeliveryQuoteDto quote = result.Value!;
        Assert.Equal(200m, quote.Subtotal);
        Assert.Equal(20m, quote.DeliveryFee);
        Assert.Equal(220m, quote.Total);
        Assert.True(quote.MeetsMinimum);
        Assert.Equal(100m, Assert.Single(quote.Lines).UnitPrice);
    }

    [Fact]
    public async Task Quote_BelowMinimum_ReportsShortfall()
    {
        await SeedAsync();

        var result = await QuoteHandler().Handle(new QuoteDeliveryOrderCommand { ZoneId = Moda.Id, Lines = [ProductLine(Ayran, 2)] }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.False(result.Value!.MeetsMinimum);
        Assert.Equal(40m, result.Value.AmountToMinimum);
    }

    [Fact]
    public async Task Quote_SetMenu_AddsSelectedOptionSurcharge()
    {
        await SeedAsync();

        var withDefault = await QuoteHandler().Handle(new QuoteDeliveryOrderCommand { Lines = [MenuLine()] }, CancellationToken.None);
        var withKola = await QuoteHandler().Handle(new QuoteDeliveryOrderCommand { Lines = [MenuLine(Kola, 2)] }, CancellationToken.None);

        Assert.Equal(250m, Assert.Single(withDefault.Value!.Lines).UnitPrice);
        DeliveryQuoteLineDto kolaLine = Assert.Single(withKola.Value!.Lines);
        Assert.Equal(260m, kolaLine.UnitPrice);
        Assert.Equal(520m, withKola.Value.Subtotal);
        Assert.Contains(kolaLine.Selections, s => s.StartsWith("Kola"));
    }

    [Fact]
    public async Task Quote_RejectsInactiveAndOutOfStockProducts()
    {
        await SeedAsync();
        Lahmacun.Update(Lahmacun.Name, Lahmacun.Price, isActive: false, Lahmacun.CategoryId);
        Ayran.SetOutOfStock(true);
        await DbContext.SaveChangesAsync();

        var inactive = await QuoteHandler().Handle(new QuoteDeliveryOrderCommand { Lines = [ProductLine(Lahmacun)] }, CancellationToken.None);
        var outOfStock = await QuoteHandler().Handle(new QuoteDeliveryOrderCommand { Lines = [ProductLine(Ayran)] }, CancellationToken.None);
        // Menünün varsayılan içeceği (Ayran) tükendi: menü ancak başka bir seçimle verilebilir.
        var menuDefault = await QuoteHandler().Handle(new QuoteDeliveryOrderCommand { Lines = [MenuLine()] }, CancellationToken.None);
        var menuKola = await QuoteHandler().Handle(new QuoteDeliveryOrderCommand { Lines = [MenuLine(Kola)] }, CancellationToken.None);

        Assert.True(inactive.IsFailure);
        Assert.True(outOfStock.IsFailure);
        Assert.Contains("tükendi", outOfStock.Error);
        Assert.True(menuDefault.IsFailure);
        Assert.True(menuKola.IsSuccess, menuKola.Error);
    }

    [Fact]
    public async Task Quote_RejectsProductOfAnotherBranch()
    {
        await SeedAsync();
        Guid otherBranchId = Guid.NewGuid();
        Category otherCategory = Category.Create("Diğer", otherBranchId);
        DbContext.Categories.Add(otherCategory);
        await DbContext.SaveChangesAsync();
        Product foreign = Product.Create("Pide", 150m, "", otherCategory.Id);
        DbContext.Products.Add(foreign);
        await DbContext.SaveChangesAsync();

        var result = await QuoteHandler().Handle(new QuoteDeliveryOrderCommand { Lines = [ProductLine(foreign)] }, CancellationToken.None);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task Quote_TotalAboveCap_IsRejected()
    {
        await SeedAsync();
        Product expensive = Product.Create("Kuzu tandır (tepsi)", 5000m, "", Category.Id);
        DbContext.Products.Add(expensive);
        await DbContext.SaveChangesAsync();

        var result = await QuoteHandler().Handle(new QuoteDeliveryOrderCommand { Lines = [ProductLine(expensive, 5)] }, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Contains("20000", result.Error);
    }

    [Fact]
    public async Task Submit_TotalMismatch_ReturnsFreshQuote_AndOpensNoOrder()
    {
        await SeedAsync();

        var result = await SubmitAsync(Submit(expectedTotal: 200m, ProductLine(Lahmacun, 2)));

        Assert.True(result.IsSuccess, result.Error);
        Assert.True(result.Value!.PriceChanged);
        Assert.Equal(220m, result.Value.Quote!.Total);
        Assert.Empty(result.Value.Token);
        Assert.Empty(DbContext.DeliveryOrders);
    }

    [Fact]
    public async Task Submit_BelowMinimum_Fails()
    {
        await SeedAsync();

        var result = await SubmitAsync(Submit(80m, ProductLine(Ayran, 2)));

        Assert.True(result.IsFailure);
        Assert.Contains("en az sipariş tutarı", result.Error);
        Assert.Empty(DbContext.DeliveryOrders);
    }

    // ── Gönderim ────────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Submit_HappyPath_SnapshotsPricesAndNotifiesOnlineOrders()
    {
        await SeedAsync();

        var result = await SubmitAsync(Submit(220m + 260m, ProductLine(Lahmacun, 2), MenuLine(Kola)));

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(1, result.Value!.Number);
        Assert.Equal(AccessToken.Length, result.Value.Token.Length);

        DeliveryOrder order = DbContext.DeliveryOrders.Single();
        Assert.Equal(DeliveryOrderStatus.Received, order.Status);
        Assert.Equal(NormalizedPhone, order.CustomerPhone);
        Assert.Equal("Moda", order.ZoneName);
        Assert.Equal(460m, order.Subtotal);
        Assert.Equal(480m, order.Total);
        Assert.Equal("203.0.113.7", order.ClientIp);
        DeliveryOrderLine menu = order.Lines.Single(l => l.Kind == DeliveryOrderLineKind.SetMenu);
        Assert.Equal(260m, menu.UnitPrice);
        Assert.Equal(Kola.Id, DeliveryScope.ParseSelections(menu.SelectionsJson)[DrinkSlotId]);

        var (branchId, payload) = Assert.Single(CashierNotifications.DeliveryOrdersChanged);
        Assert.Equal(Branch.Id, branchId);
        Assert.True(payload.IsNew);
        Assert.Equal(order.Id, payload.Id);

        // Numara şube içinde artar.
        DeliveryOrder second = await SubmitOkAsync("0533 000 00 01");
        Assert.Equal(2, second.Number);
    }

    [Fact]
    public async Task Submit_Honeypot_SavesNothing()
    {
        await SeedAsync();
        SubmitDeliveryOrderCommand command = Submit(220m, ProductLine(Lahmacun, 2));
        command.Website = "http://spam.example";

        var result = await SubmitAsync(command);

        Assert.True(result.IsFailure);
        Assert.Equal(SubmitDeliveryOrderCommandHandler.HoneypotMessage, result.Error);
        Assert.Empty(DbContext.DeliveryOrders);
        Assert.Empty(CashierNotifications.DeliveryOrdersChanged);
    }

    [Fact]
    public async Task Submit_BlockedPhone_GetsHonestMessage()
    {
        await SeedAsync();
        DbContext.BlockedPhones.Add(BlockedPhone.Create(Branch.Id, "+90 532 123 4567", "Sahte sipariş", CurrentUser.UserId));
        await DbContext.SaveChangesAsync();

        var result = await SubmitAsync(Submit(220m, ProductLine(Lahmacun, 2)));

        Assert.True(result.IsFailure);
        Assert.Equal("Sipariş alınamadı, lütfen restoranı arayın.", result.Error);
        Assert.Empty(DbContext.DeliveryOrders);
    }

    [Fact]
    public async Task Submit_PerPhoneOpenLimit_BlocksThirdOpenOrder()
    {
        await SeedAsync(Settings(maxOpen: 2, maxPerDay: 5));
        await SubmitOkAsync();
        await SubmitOkAsync();

        var third = await SubmitAsync(Submit(220m, ProductLine(Lahmacun, 2)));

        Assert.True(third.IsFailure);
        Assert.Contains("tamamlanmamış 2 siparişiniz", third.Error);
    }

    [Fact]
    public async Task Submit_PerPhoneDailyLimit_CountsClosedOrdersToo()
    {
        await SeedAsync(Settings(maxOpen: 1, maxPerDay: 1));
        DeliveryOrder first = await SubmitOkAsync();
        first.Reject("Kapanıyoruz", CurrentUser.UserId, DateTime.UtcNow);
        await DbContext.SaveChangesAsync();

        var second = await SubmitAsync(Submit(220m, ProductLine(Lahmacun, 2)));

        Assert.True(second.IsFailure);
        Assert.Equal(SubmitDeliveryOrderCommandHandler.DailyLimitMessage, second.Error);
    }

    [Fact]
    public async Task Submit_PerIpPendingLimit_BlocksFourthWaitingOrder()
    {
        await SeedAsync();
        await SubmitOkAsync("0533 000 00 01");
        await SubmitOkAsync("0533 000 00 02");
        await SubmitOkAsync("0533 000 00 03");

        SubmitDeliveryOrderCommand fourth = Submit(220m, ProductLine(Lahmacun, 2));
        fourth.Phone = "0533 000 00 04";
        var result = await SubmitAsync(fourth);

        Assert.True(result.IsFailure);
        Assert.Equal(SubmitDeliveryOrderCommandHandler.PendingPerIpMessage, result.Error);
    }

    [Fact]
    public async Task Submit_OutsideHours_IsRejectedWithNextOpening()
    {
        await SeedAsync();
        // 21:45 İstanbul: kapanış 22:00, son sipariş 30 dk önce.
        Clock.Now = new DateTimeOffset(DateTime.UtcNow.Date.AddHours(18).AddMinutes(45), TimeSpan.Zero);

        var result = await SubmitAsync(Submit(220m, ProductLine(Lahmacun, 2)));

        Assert.True(result.IsFailure);
        Assert.Contains("Yarın 11:00", result.Error);
    }

    [Fact]
    public async Task Submit_ClosedDay_IsRejected()
    {
        await SeedAsync(Settings(allDaysOpen: false));

        var result = await SubmitAsync(Submit(220m, ProductLine(Lahmacun, 2)));

        Assert.True(result.IsFailure);
        Assert.Contains("kapalı", result.Error);
    }

    [Fact]
    public async Task Submit_PausedBranch_IsRejected()
    {
        await SeedAsync();
        Branch.SetOnlineOrdersPaused(true);
        await DbContext.SaveChangesAsync();

        var result = await SubmitAsync(Submit(220m, ProductLine(Lahmacun, 2)));

        Assert.True(result.IsFailure);
        Assert.Equal(DeliveryScope.PausedMessage, result.Error);
    }

    [Fact]
    public async Task Submit_ZoneOfAnotherBranch_IsRejected()
    {
        await SeedAsync();
        DeliveryZone foreign = DeliveryZone.Create(Guid.NewGuid(), "Beşiktaş", 10m, 0m, 30, 0);
        DbContext.DeliveryZones.Add(foreign);
        await DbContext.SaveChangesAsync();
        SubmitDeliveryOrderCommand command = Submit(210m, ProductLine(Lahmacun, 2));
        command.ZoneId = foreign.Id;

        var result = await SubmitAsync(command);

        Assert.True(result.IsFailure);
        Assert.Equal(DeliveryPublicMessages.ZoneUnavailable, result.Error);
    }

    [Fact]
    public async Task Submit_PaymentMethodNotAccepted_IsRejected()
    {
        await SeedAsync(Settings(acceptCash: false));

        var result = await SubmitAsync(Submit(220m, ProductLine(Lahmacun, 2)));

        Assert.True(result.IsFailure);
        Assert.Contains("nakit", result.Error);
    }

    [Fact]
    public async Task Submit_SameClientRequestId_ReturnsTheFirstOrder()
    {
        await SeedAsync();
        SubmitDeliveryOrderCommand command = Submit(220m, ProductLine(Lahmacun, 2));

        var first = await SubmitAsync(command);
        var again = await SubmitAsync(command);

        Assert.True(again.IsSuccess, again.Error);
        Assert.Equal(first.Value!.Token, again.Value!.Token);
        Assert.Equal(first.Value.Number, again.Value.Number);
        Assert.Single(DbContext.DeliveryOrders);
        Assert.Single(CashierNotifications.DeliveryOrdersChanged);
    }

    // ── Telefon doğrulama ───────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Submit_VerificationRequiredButSmsNotConfigured_IsNotAsked()
    {
        await SeedAsync(Settings(requirePhoneVerification: true));
        Sms.IsConfigured = false;

        DeliveryOrder order = await SubmitOkAsync();

        Assert.Equal(DeliveryOrderStatus.Received, order.Status);
    }

    [Fact]
    public async Task Submit_VerificationRequiredAndSmsConfigured_NeedsSingleUseToken()
    {
        await SeedAsync(Settings(requirePhoneVerification: true));
        Sms.IsConfigured = true;

        var withoutToken = await SubmitAsync(Submit(220m, ProductLine(Lahmacun, 2)));
        Assert.True(withoutToken.IsFailure);
        Assert.Equal(SubmitDeliveryOrderCommandHandler.VerificationRequiredMessage, withoutToken.Error);

        var sent = await new SendPhoneVerificationCommandHandler(Db, Tenant, Sms, Clock)
            .Handle(new SendPhoneVerificationCommand { Phone = Phone }, CancellationToken.None);
        Assert.True(sent.IsSuccess, sent.Error);
        var (smsPhone, message) = Assert.Single(Sms.SentMessages);
        Assert.Equal(NormalizedPhone, smsPhone);
        string code = Regex.Match(message, @"\b\d{6}\b").Value;
        // Kod veritabanında açık durmaz.
        Assert.DoesNotContain(DbContext.CustomerPhoneVerifications, v => v.CodeHash.Contains(code));

        var verifyHandler = new VerifyPhoneCommandHandler(Db, Tenant, Clock);
        var wrong = await verifyHandler.Handle(new VerifyPhoneCommand { Phone = Phone, Code = code == "000000" ? "111111" : "000000" }, CancellationToken.None);
        Assert.True(wrong.IsFailure);
        Assert.Contains("4 deneme", wrong.Error);

        var verified = await verifyHandler.Handle(new VerifyPhoneCommand { Phone = Phone, Code = code }, CancellationToken.None);
        Assert.True(verified.IsSuccess, verified.Error);

        SubmitDeliveryOrderCommand command = Submit(220m, ProductLine(Lahmacun, 2));
        command.VerificationToken = verified.Value!.VerificationToken;
        var ok = await SubmitAsync(command);
        Assert.True(ok.IsSuccess, ok.Error);

        // Anahtar tek kullanımlık.
        SubmitDeliveryOrderCommand reuse = Submit(220m, ProductLine(Lahmacun, 2));
        reuse.VerificationToken = verified.Value.VerificationToken;
        var reused = await SubmitAsync(reuse);
        Assert.True(reused.IsFailure);
    }

    [Fact]
    public async Task SendVerification_WhenBranchDoesNotRequireIt_SendsNoSms()
    {
        await SeedAsync(Settings(requirePhoneVerification: false));
        Sms.IsConfigured = true;

        var result = await new SendPhoneVerificationCommandHandler(Db, Tenant, Sms, Clock)
            .Handle(new SendPhoneVerificationCommand { Phone = Phone }, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Empty(Sms.SentMessages);
    }

    // ── Sipariş sayfası ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task OnlineOrdering_ShowsMenuWithStockFlags_ZonesAndEnabledBranches()
    {
        await SeedAsync();
        Ayran.SetOutOfStock(true);
        Branch second = Branch.Create(Company.Id, "Beşiktaş", "", "", "", "İstanbul", "Beşiktaş", "", 10m);
        second.SetOnlineOrderSettings(Settings());
        Branch closed = Branch.Create(Company.Id, "Şişli", "", "", "", "İstanbul", "Şişli", "", 10m);
        DbContext.Branches.AddRange(second, closed);
        await DbContext.SaveChangesAsync();

        var handler = new GetOnlineOrderingQueryHandler(Db, Tenant,
            Microsoft.Extensions.Options.Options.Create(new RestaurantBill.Application.Common.BunnyStorageOptions()), Sms, Clock);
        var result = await handler.Handle(new GetOnlineOrderingQuery { BranchId = Branch.Id }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        OnlineOrderingDto dto = result.Value!;
        Assert.Equal(OnlineOrderingState.Open, dto.State);
        Assert.Equal("Moda", Assert.Single(dto.Zones).Name);
        Assert.Equal(new[] { PaymentMethod.Nakit, PaymentMethod.Kart }, dto.PaymentMethods);
        Assert.True(dto.Categories.SelectMany(c => c.Products).Single(p => p.Id == Ayran.Id).IsOutOfStock);
        OnlineSetMenuDto menu = Assert.Single(dto.SetMenus);
        Assert.True(menu.IsAvailable);
        Assert.False(menu.Slots.Single(s => s.Name == "İçecek").Options.Single(o => o.ProductId == Ayran.Id).IsAvailable);
        // Online siparişi kapalı şube seçicide görünmez.
        Assert.Equal(new[] { "Beşiktaş", "Kadıköy" }, dto.Branches.Select(b => b.Name).Order().ToArray());
        Assert.False(dto.RequiresPhoneVerification);
    }
}
