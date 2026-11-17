using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Features.CustomerSite;
using RestaurantBill.Application.Features.CustomerSite.Public;
using RestaurantBill.Application.Features.CustomerSite.Staff;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.CustomerSite;

// Müşteri akışı yenilemesinin yeni alanları: masa menüsünde "Tükendi", ret nedeni, masa kapasitesi, "Hesap iste" tutarı
// ve misafirin rezervasyonunu kendisi iptal etmesi (kod + telefon, 2 saat kuralı).
public class CustomerFlowTests : ApplicationTestBase
{
    private const string Slug = "akis-restoran";
    private const string Phone = "0532 123 45 67";

    private readonly FakeTenantResolver _tenant = new() { Slug = Slug };
    private readonly FakeTableNotificationService _tableNotifications = new();
    private readonly FakeCashierNotificationService _cashierNotifications = new();
    private readonly ManualClock _clock = new();
    private readonly ReservationLookupGuard _guard;

    private Table _table = default!;
    private Product _product = default!;

    public CustomerFlowTests()
    {
        _guard = new ReservationLookupGuard(_clock);
    }

    private sealed class ManualClock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(DateTime.UtcNow.Date.AddHours(9), TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private DateTime Now => _clock.Now.UtcDateTime;

    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private async Task SeedAsync()
    {
        User owner = await SeedActorAsync();
        Company company = Company.Create("Akış Restoran", owner);
        company.Slug = Slug;
        DbContext.Companies.Add(company);
        await DbContext.SaveChangesAsync();

        Branch branch = Branch.Create(company.Id, "Merkez", "", "", "", "İstanbul", "Fatih", "", 10m);
        SetId(branch, CurrentUser.BranchId);
        DbContext.Branches.Add(branch);
        await DbContext.SaveChangesAsync();

        _table = await SeedTableAsync();
        _product = Product.Create("Künefe", 220m, "", await DefaultCategoryIdAsync());
        DbContext.Products.Add(_product);
        await DbContext.SaveChangesAsync();
    }

    private Task<Result<OrderRequestStatusDto>> SendOrderRequestAsync(params Product[] products)
        => new CreateOrderRequestCommandHandler(Db, _tenant, new OrderPricingService(Db), _tableNotifications).Handle(new CreateOrderRequestCommand
        {
            TableId = _table.Id,
            Items = products.Select(p => new OrderRequestItemInput { ProductId = p.Id, Quantity = 1 }).ToList()
        }, CancellationToken.None);

    private Task<Result<OrderRequestStatusDto>> StatusAsync(Guid id)
        => new GetOrderRequestStatusQueryHandler(Db, _tenant).Handle(new GetOrderRequestStatusQuery { Id = id }, CancellationToken.None);

    private Task<Result> RejectAsync(Guid id, string? reason)
        => new RejectOrderRequestCommandHandler(Db, CurrentUser, _tableNotifications)
            .Handle(new RejectOrderRequestCommand { Id = id, Reason = reason }, CancellationToken.None);

    private async Task<Reservation> SeedReservationAsync(DateTime startUtc, bool confirm = false)
    {
        Reservation reservation = Reservation.CreateRequest(_table, "Ayşe Yılmaz", Phone, startUtc, startUtc.AddHours(2), 4, null);
        if (confirm) reservation.Confirm();
        DbContext.Reservations.Add(reservation);
        await DbContext.SaveChangesAsync();
        return reservation;
    }

    private Task<Result<ReservationDetailDto>> GuestCancelAsync(string code, string phone = Phone)
        => new CancelReservationByGuestCommandHandler(Db, _tenant, _guard, _tableNotifications, _clock)
            .Handle(new CancelReservationByGuestCommand { Code = code, Phone = phone }, CancellationToken.None);

    private Task<Result<ReservationDetailDto>> DetailAsync(Reservation reservation)
        => new GetReservationByTokenQueryHandler(Db, _tenant, _clock)
            .Handle(new GetReservationByTokenQuery { Token = reservation.AccessToken }, CancellationToken.None);

    private Task<Result<PublicSiteDto>> SiteAsync()
        => new GetPublicSiteQueryHandler(Db, _tenant, Options.Create(new BunnyStorageOptions { CdnBaseUrl = "https://cdn.test" }))
            .Handle(new GetPublicSiteQuery(), CancellationToken.None);

    // ── Masa menüsünde "Tükendi" ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task PublicSite_ExposesOutOfStockFlag_ForTheTableMenu()
    {
        await SeedAsync();
        _product.SetOutOfStock(true);
        await DbContext.SaveChangesAsync();

        var result = await SiteAsync();

        Assert.True(result.IsSuccess, result.Error);
        PublicProductDto product = result.Value!.Categories.SelectMany(c => c.Products).Single(p => p.Id == _product.Id);
        Assert.True(product.IsOutOfStock);
    }

    [Fact]
    public async Task CreateOrderRequest_WithOutOfStockProduct_IsRejectedAndNothingReachesTheWaiter()
    {
        await SeedAsync();
        Product ayran = Product.Create("Ayran", 45m, "", await DefaultCategoryIdAsync());
        DbContext.Products.Add(ayran);
        _product.SetOutOfStock(true);
        await DbContext.SaveChangesAsync();

        var result = await SendOrderRequestAsync(ayran, _product);

        Assert.False(result.IsSuccess);
        Assert.Equal(CreateOrderRequestCommandHandler.OutOfStockMessage("Künefe"), result.Error);
        Assert.Empty(DbContext.OrderRequests.ToList());
        Assert.Equal(0, _tableNotifications.CustomerRequestsChangedCount);
    }

    [Fact]
    public async Task CreateOrderRequest_AfterProductBackInStock_Succeeds()
    {
        await SeedAsync();
        _product.SetOutOfStock(true);
        await DbContext.SaveChangesAsync();
        Assert.False((await SendOrderRequestAsync(_product)).IsSuccess);

        _product.SetOutOfStock(false);
        await DbContext.SaveChangesAsync();

        Assert.True((await SendOrderRequestAsync(_product)).IsSuccess);
    }

    // ── Ret nedeni ──────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task RejectOrderRequest_WithReason_GuestSeesTheReason()
    {
        await SeedAsync();
        Guid id = (await SendOrderRequestAsync(_product)).Value!.Id;

        var rejected = await RejectAsync(id, "  Künefe bu akşam bitti, katmer önerebiliriz.  ");
        var status = await StatusAsync(id);

        Assert.True(rejected.IsSuccess, rejected.Error);
        Assert.Equal((int)OrderRequestStatus.Rejected, status.Value!.Status);
        Assert.Equal("Künefe bu akşam bitti, katmer önerebiliriz.", status.Value.RejectReason);
        Assert.Contains(DbContext.AuditLogs.ToList(), l => l.Action == "OrderRequestRejected" && l.Message.Contains("katmer"));
    }

    [Fact]
    public async Task RejectOrderRequest_WithoutReason_ReturnsEmptyReason()
    {
        await SeedAsync();
        Guid id = (await SendOrderRequestAsync(_product)).Value!.Id;

        Assert.True((await RejectAsync(id, null)).IsSuccess);

        Assert.Equal(string.Empty, (await StatusAsync(id)).Value!.RejectReason);
    }

    [Fact]
    public async Task RejectOrderRequest_WithTooLongReason_FailsAndStaysPending()
    {
        await SeedAsync();
        Guid id = (await SendOrderRequestAsync(_product)).Value!.Id;

        var result = await RejectAsync(id, new string('x', OrderRequest.RejectReasonMaxLength + 1));

        Assert.False(result.IsSuccess);
        Assert.Equal((int)OrderRequestStatus.Pending, (await StatusAsync(id)).Value!.Status);
    }

    [Fact]
    public void RejectOrderRequestValidator_LimitsTheReasonLength()
    {
        var validator = new RejectOrderRequestCommandValidator();
        Assert.True(validator.Validate(new RejectOrderRequestCommand { Id = Guid.NewGuid(), Reason = null }).IsValid);
        Assert.False(validator.Validate(new RejectOrderRequestCommand { Id = Guid.NewGuid(), Reason = new string('x', 301) }).IsValid);
    }

    // ── Masa kapasitesi ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task PublicSite_ReturnsTableCapacity()
    {
        await SeedAsync();
        _table.SetCapacity(6);
        await DbContext.SaveChangesAsync();

        var result = await SiteAsync();

        PublicTableDto table = result.Value!.Regions.SelectMany(r => r.Tables).Single(t => t.Id == _table.Id);
        Assert.Equal(6, table.Capacity);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(51)]
    public void Table_SetCapacity_OutOfRange_Throws(int capacity)
    {
        Table table = Table.Create("Masa 1", "", Guid.NewGuid());
        Assert.Throws<DomainException>(() => table.SetCapacity(capacity));
    }

    [Fact]
    public void Table_SetCapacity_NullClearsIt()
    {
        Table table = Table.Create("Masa 1", "", Guid.NewGuid());
        table.SetCapacity(4);
        table.SetCapacity(null);
        Assert.Null(table.Capacity);
    }

    // ── "Hesap iste" tutarı ─────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task RequestBill_ReturnsTheOpenBillTotal()
    {
        await SeedAsync();
        Order order = Order.Create(_table.Id, CurrentUser.BranchId);
        order.AddItem(_product, 2);
        DbContext.Orders.Add(order);
        await DbContext.SaveChangesAsync();

        var result = await new RequestTableBillCommandHandler(Db, _tenant, _tableNotifications, _cashierNotifications, new TableActionCooldown(_clock), _clock)
            .Handle(new RequestTableBillCommand { TableId = _table.Id }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(440m, result.Value!.BillTotal);
    }

    // ── Misafirin rezervasyonu kendisi iptal etmesi ─────────────────────────────────────────────

    [Fact]
    public async Task GuestCancel_WithCodeAndPhone_CancelsAndNotifiesStaff()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync(Now.AddDays(1), confirm: true);

        var result = await GuestCancelAsync(ReservationCode.Format(reservation.Code), "+90 532 123 45 67");

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal((int)ReservationStatus.Cancelled, result.Value!.Status);
        Assert.False(result.Value.CanCancel);
        Assert.Equal(ReservationStatus.Cancelled, DbContext.Reservations.Single().Status);
        Assert.Equal(1, _tableNotifications.CustomerRequestsChangedCount);
        Assert.Contains(DbContext.AuditLogs.ToList(), l => l.Action == "ReservationCancelledByGuest" && l.EntityId == reservation.Id);
    }

    [Fact]
    public async Task GuestCancel_PendingRequest_CanBeCancelled()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync(Now.AddDays(2));

        var result = await GuestCancelAsync(reservation.Code);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(ReservationStatus.Cancelled, DbContext.Reservations.Single().Status);
    }

    [Fact]
    public async Task GuestCancel_AlsoCancelsThePendingPreOrder()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync(Now.AddDays(1), confirm: true);
        OrderRequest preOrder = OrderRequest.CreatePreOrder(reservation, null);
        preOrder.AddItem(_product, 1, null, _product.Price);
        DbContext.OrderRequests.Add(preOrder);
        await DbContext.SaveChangesAsync();

        var result = await GuestCancelAsync(reservation.Code);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(OrderRequestStatus.Cancelled, DbContext.OrderRequests.Single().Status);
    }

    [Fact]
    public async Task GuestCancel_LessThanTwoHoursBefore_IsRefused()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync(Now.AddHours(1).AddMinutes(59), confirm: true);

        var detail = await DetailAsync(reservation);
        var result = await GuestCancelAsync(reservation.Code);

        Assert.False(detail.Value!.CanCancel);
        Assert.Equal(reservation.ReservationTime.AddHours(-2), detail.Value.CancelDeadline);
        Assert.False(result.IsSuccess);
        Assert.Contains("2 saatten az", result.Error);
        Assert.Equal(ReservationStatus.Confirmed, DbContext.Reservations.Single().Status);
        Assert.Equal(0, _tableNotifications.CustomerRequestsChangedCount);
    }

    [Fact]
    public async Task GuestCancel_JustBeforeTheCutoff_IsAllowed()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync(Now.AddHours(2).AddMinutes(1), confirm: true);

        Assert.True((await DetailAsync(reservation)).Value!.CanCancel);
        Assert.True((await GuestCancelAsync(reservation.Code)).IsSuccess);
    }

    [Fact]
    public async Task GuestCancel_WithWrongPhone_FailsWithTheGenericMessageAndCountsTheAttempt()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync(Now.AddDays(1), confirm: true);

        var result = await GuestCancelAsync(reservation.Code, "0532 999 99 99");

        Assert.False(result.IsSuccess);
        Assert.Equal(LookupReservationCommandHandler.NotFoundMessage, result.Error);
        Assert.Equal(ReservationStatus.Confirmed, DbContext.Reservations.Single().Status);
    }

    [Fact]
    public async Task GuestCancel_AfterTooManyWrongAttempts_IsLocked()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync(Now.AddDays(1), confirm: true);

        for (int i = 0; i < 20 && _guard.LockedFor(reservation.Code) is null; i++)
            await GuestCancelAsync(reservation.Code, "0532 999 99 99");

        var result = await GuestCancelAsync(reservation.Code);

        Assert.False(result.IsSuccess);
        Assert.Equal(LookupReservationCommandHandler.LockedMessage, result.Error);
        Assert.Equal(ReservationStatus.Confirmed, DbContext.Reservations.Single().Status);
    }

    [Fact]
    public async Task GuestCancel_FromAnotherRestaurantsSlug_IsNotFound()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync(Now.AddDays(1), confirm: true);

        var result = await new CancelReservationByGuestCommandHandler(Db, new FakeTenantResolver { Slug = "baska" }, _guard, _tableNotifications, _clock)
            .Handle(new CancelReservationByGuestCommand { Code = reservation.Code, Phone = Phone }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ReservationStatus.Confirmed, DbContext.Reservations.Single().Status);
    }

    [Theory]
    [InlineData(ReservationStatus.Rejected)]
    [InlineData(ReservationStatus.Cancelled)]
    [InlineData(ReservationStatus.Seated)]
    public async Task GuestCancel_ClosedReservation_IsRefused(ReservationStatus status)
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync(Now.AddDays(1));
        if (status == ReservationStatus.Rejected) reservation.Reject();
        else if (status == ReservationStatus.Cancelled) reservation.Cancel();
        else { reservation.Confirm(); reservation.Seat(Now); }
        await DbContext.SaveChangesAsync();

        var detail = await DetailAsync(reservation);
        var result = await GuestCancelAsync(reservation.Code);

        Assert.False(detail.Value!.CanCancel);
        Assert.False(result.IsSuccess);
        Assert.Equal(status, DbContext.Reservations.Single().Status);
    }
}
