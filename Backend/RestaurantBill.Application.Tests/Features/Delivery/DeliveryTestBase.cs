using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.Delivery.Public;
using RestaurantBill.Application.Features.Delivery.Staff;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.Delivery;

// Şirket (slug) → şube (CurrentUser.BranchId, İstanbul, online sipariş açık 11:00–22:00) → kategori → ürünler +
// "Adana Menü" (sabit Adana + içecek seçimi: Ayran varsayılan, Kola +10) → "Moda" bölgesi (₺20, en az ₺100, 40 dk).
// Saat 12:00 (İstanbul) sabittir.
public abstract class DeliveryTestBase : ApplicationTestBase
{
    protected const string Slug = "paket-restoran";
    protected const string Phone = "0532 123 45 67";
    protected const string NormalizedPhone = "+905321234567";

    protected readonly FakeTenantResolver Tenant = new() { Slug = Slug };
    protected readonly FakeCashierNotificationService CashierNotifications = new();
    protected readonly FakeKitchenNotificationService KitchenNotifications = new();
    protected readonly FakeCourierNotificationService CourierNotifications = new();
    protected readonly FakeTableNotificationService TableNotifications = new();
    protected readonly FakeSmsSender Sms = new() { IsConfigured = false };
    protected readonly FakeClientInfo Client = new();
    protected readonly ManualClock Clock = new();

    protected Company Company = default!;
    protected Branch Branch = default!;
    protected Category Category = default!;
    protected Product Lahmacun = default!;
    protected Product Ayran = default!;
    protected Product Kola = default!;
    protected Product Adana = default!;
    protected SetMenu AdanaMenu = default!;
    protected DeliveryZone Moda = default!;

    protected sealed class ManualClock : TimeProvider
    {
        // 12:00 İstanbul (UTC+3), bugünün tarihiyle: kayıtların CreatedAt'ı gerçek saattir, günlük sınır son 24 saattir.
        public DateTimeOffset Now { get; set; } = new(DateTime.UtcNow.Date.AddHours(9), TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    protected sealed class FakeClientInfo : IClientInfo
    {
        public string IpAddress { get; set; } = "203.0.113.7";
    }

    protected static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    protected static OnlineOrderSettings Settings(bool enabled = true, bool allDaysOpen = true, int maxOpen = 2, int maxPerDay = 5,
        bool requirePhoneVerification = false, bool acceptCash = true, bool acceptCard = true, int autoRejectMinutes = 10)
        => OnlineOrderSettings.Create(enabled,
            ReservationSettings.WeekOrder.Select(d => new OnlineOrderDayHours(d, allDaysOpen, new TimeOnly(11, 0), new TimeOnly(22, 0))),
            lastOrderMinutesBeforeClose: 30, defaultEtaMinutes: 45, autoRejectAfterMinutes: autoRejectMinutes,
            maxOpenOrdersPerPhone: maxOpen, maxOrdersPerPhonePerDay: maxPerDay, acceptCash: acceptCash, acceptCard: acceptCard,
            requirePhoneVerification: requirePhoneVerification, preOrderEnabled: false, preOrderLeadMinutes: 60);

    protected async Task SeedAsync(OnlineOrderSettings? settings = null)
    {
        User owner = await SeedActorAsync("Kasiyer Kemal");
        Company = Company.Create("Paket Restoran", owner);
        Company.Slug = Slug;
        DbContext.Companies.Add(Company);
        await DbContext.SaveChangesAsync();

        Branch = Branch.Create(Company.Id, "Kadıköy", "", "0216 000 00 00", "", "İstanbul", "Kadıköy", "", 10m);
        SetId(Branch, CurrentUser.BranchId);
        Branch.SetOnlineOrderSettings(settings ?? Settings());
        DbContext.Branches.Add(Branch);
        await DbContext.SaveChangesAsync();

        Category = Category.Create("Ana yemek", Branch.Id);
        DbContext.Categories.Add(Category);
        await DbContext.SaveChangesAsync();

        Lahmacun = Product.Create("Lahmacun", 100m, "", Category.Id);
        Ayran = Product.Create("Ayran", 30m, "", Category.Id);
        Kola = Product.Create("Kola", 40m, "", Category.Id);
        Adana = Product.Create("Adana Kebap", 300m, "", Category.Id);
        DbContext.Products.AddRange(Lahmacun, Ayran, Kola, Adana);
        await DbContext.SaveChangesAsync();

        AdanaMenu = SetMenu.Create(Branch.Id, "Adana Menü", 250m);
        AdanaMenu.SetSlots(
        [
            new SetMenuSlotDraft("Ana yemek", [new SetMenuOptionDraft(Adana, 0m, true)]),
            new SetMenuSlotDraft("İçecek", [new SetMenuOptionDraft(Ayran, 0m, true), new SetMenuOptionDraft(Kola, 10m, false)])
        ]);
        DbContext.SetMenus.Add(AdanaMenu);
        await DbContext.SaveChangesAsync();

        Moda = DeliveryZone.Create(Branch.Id, "Moda", 20m, 100m, 40, 0);
        DbContext.DeliveryZones.Add(Moda);
        await DbContext.SaveChangesAsync();
    }

    protected Guid DrinkSlotId => AdanaMenu.Slots.Single(s => s.Name == "İçecek").Id;

    protected static CartLineInput ProductLine(Product product, int quantity = 1, string? note = null)
        => new() { Kind = CartLineInput.ProductKind, ProductId = product.Id, Quantity = quantity, Note = note };

    protected CartLineInput MenuLine(Product? drink = null, int quantity = 1)
        => new()
        {
            Kind = CartLineInput.SetMenuKind,
            SetMenuId = AdanaMenu.Id,
            Quantity = quantity,
            Selections = drink is null ? [] : [new CartSelectionInput { SlotId = DrinkSlotId, ProductId = drink.Id }]
        };

    protected SubmitDeliveryOrderCommand Submit(decimal expectedTotal, params CartLineInput[] lines) => new()
    {
        ClientRequestId = Guid.NewGuid(),
        ZoneId = Moda.Id,
        Lines = lines.ToList(),
        CustomerName = "Ahmet Yılmaz",
        Phone = Phone,
        Address = "Moda Cad. No:1 D:3",
        AddressDirections = "Eczanenin üstü",
        Note = "Zile basmayın",
        PaymentMethod = PaymentMethod.Nakit,
        ExpectedTotal = expectedTotal
    };

    protected SubmitDeliveryOrderCommandHandler SubmitHandler()
        => new(Db, Tenant, new OrderPricingService(Db), Sms, Client, CashierNotifications, Clock);

    protected QuoteDeliveryOrderCommandHandler QuoteHandler() => new(Db, Tenant, new OrderPricingService(Db));

    protected async Task<Result<SubmitDeliveryOrderResultDto>> SubmitAsync(SubmitDeliveryOrderCommand command)
        => await SubmitHandler().Handle(command, CancellationToken.None);

    /// <summary>2 Lahmacun (₺200) + ₺20 teslimat = ₺220.</summary>
    protected async Task<DeliveryOrder> SubmitOkAsync(string phone = Phone)
    {
        SubmitDeliveryOrderCommand command = Submit(220m, ProductLine(Lahmacun, 2));
        command.Phone = phone;
        Result<SubmitDeliveryOrderResultDto> result = await SubmitAsync(command);
        Assert.True(result.IsSuccess, result.Error);
        Assert.False(result.Value!.PriceChanged);
        return DbContext.DeliveryOrders.Single(d => d.AccessToken == result.Value.Token);
    }

    protected AcceptDeliveryOrderCommandHandler AcceptHandler(ICurrentUserService? user = null)
        => new(Db, user ?? CurrentUser, CashierNotifications, KitchenNotifications, Clock);

    protected async Task AcceptOkAsync(DeliveryOrder order, int? eta = null)
    {
        Result result = await AcceptHandler().Handle(new AcceptDeliveryOrderCommand { Id = order.Id, EtaMinutes = eta }, CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);
    }
}
