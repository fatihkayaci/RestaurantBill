using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Features.CustomerSite;
using RestaurantBill.Application.Features.CustomerSite.Public;
using RestaurantBill.Application.Features.CustomerSite.Staff;
using RestaurantBill.Application.Features.Delivery.Staff;
using RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToKitchen;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.CustomerSite;

// Rezervasyon ön siparişi: pencere, ver/değiştir/iptal, "Geldi", "Mutfağa şimdi gönder", "Gelmedi", iptal/ret zinciri,
// süre dolumu. Saat sabit: 12:00 İstanbul (09:00 UTC); rezervasyon 14:00 İstanbul, ön sipariş 13:00'te açılır.
public class ReservationPreOrderTests : ApplicationTestBase
{
    private const string Slug = "rezervasyon-restoran";

    private readonly FakeTenantResolver _tenant = new() { Slug = Slug };
    private readonly FakeTableNotificationService _tableNotifications = new();
    private readonly FakeCashierNotificationService _cashierNotifications = new();
    private readonly FakeKitchenNotificationService _kitchenNotifications = new();
    private readonly ManualClock _clock = new();

    private Branch _branch = default!;
    private Table _table = default!;
    private Product _corba = default!;
    private Product _kebap = default!;

    private sealed class ManualClock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(DateTime.UtcNow.Date.AddDays(1).AddHours(9), TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private DateTime Now => _clock.Now.UtcDateTime;
    private DateTime ReservationAt => Now.Date.AddHours(11); // 14:00 İstanbul

    private void At(DateTime utc) => _clock.Now = new DateTimeOffset(utc, TimeSpan.Zero);

    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private static OnlineOrderSettings Settings(bool preOrderEnabled = true, int leadMinutes = 60)
        => OnlineOrderSettings.Create(false,
            ReservationSettings.WeekOrder.Select(d => new OnlineOrderDayHours(d, true, new TimeOnly(11, 0), new TimeOnly(22, 0))),
            lastOrderMinutesBeforeClose: 30, defaultEtaMinutes: 45, autoRejectAfterMinutes: 10,
            maxOpenOrdersPerPhone: 2, maxOrdersPerPhonePerDay: 5, acceptCash: true, acceptCard: true,
            requirePhoneVerification: false, preOrderEnabled: preOrderEnabled, preOrderLeadMinutes: leadMinutes);

    private async Task SeedAsync(bool preOrderEnabled = true)
    {
        User owner = await SeedActorAsync("Admin Ayşe");
        Company company = Company.Create("Rezervasyon Restoran", owner);
        company.Slug = Slug;
        DbContext.Companies.Add(company);
        await DbContext.SaveChangesAsync();

        _branch = Branch.Create(company.Id, "Merkez", "", "0212 000 00 00", "", "İstanbul", "Fatih", "", 10m);
        SetId(_branch, CurrentUser.BranchId);
        _branch.SetOnlineOrderSettings(Settings(preOrderEnabled));
        DbContext.Branches.Add(_branch);
        await DbContext.SaveChangesAsync();

        _table = await SeedTableAsync();
        Guid categoryId = await DefaultCategoryIdAsync();
        _corba = Product.Create("Mercimek Çorbası", 120m, "", categoryId);
        _kebap = Product.Create("Adana Kebap", 300m, "", categoryId);
        DbContext.Products.AddRange(_corba, _kebap);
        await DbContext.SaveChangesAsync();
    }

    private async Task<Reservation> SeedReservationAsync(bool confirm = true, DateTime? startUtc = null)
    {
        DateTime start = startUtc ?? ReservationAt;
        Reservation reservation = Reservation.CreateRequest(_table, "Ahmet Yılmaz", "0555 123 45 67", start, start.AddHours(2), 4, null);
        if (confirm) reservation.Confirm();
        DbContext.Reservations.Add(reservation);
        await DbContext.SaveChangesAsync();
        return reservation;
    }

    private Task<Result<ReservationDetailDto>> GetAsync(string token)
        => new GetReservationByTokenQueryHandler(Db, _tenant, _clock).Handle(new GetReservationByTokenQuery { Token = token }, CancellationToken.None);

    private Task<Result<ReservationDetailDto>> PutAsync(string token, params (Product Product, int Quantity)[] items)
        => new UpsertPreOrderCommandHandler(Db, _tenant, new OrderPricingService(Db), _tableNotifications, _clock).Handle(new UpsertPreOrderCommand
        {
            Token = token,
            Note = "Doğum günü",
            Items = items.Select(i => new OrderRequestItemInput { ProductId = i.Product.Id, Quantity = i.Quantity, Note = "" }).ToList()
        }, CancellationToken.None);

    private Task<Result<ReservationDetailDto>> DeleteAsync(string token)
        => new CancelPreOrderCommandHandler(Db, _tenant, _tableNotifications, _clock).Handle(new CancelPreOrderCommand { Token = token }, CancellationToken.None);

    private Task<Result> ArrivalAsync(Reservation reservation, ReservationArrival action, FakeCurrentUserService? user = null)
        => new ReservationArrivalCommandHandler(Db, user ?? CurrentUser, _tableNotifications, _cashierNotifications, _kitchenNotifications, _clock)
            .Handle(new ReservationArrivalCommand { Id = reservation.Id, Action = action }, CancellationToken.None);

    private Task<Result> DecideAsync(Reservation reservation, ReservationDecision decision)
        => new DecideReservationCommandHandler(Db, CurrentUser, _tableNotifications)
            .Handle(new DecideReservationCommand { Id = reservation.Id, Decision = decision }, CancellationToken.None);

    private async Task<Reservation> SeedWithPreOrderAsync()
    {
        Reservation reservation = await SeedReservationAsync();
        At(ReservationAt.AddMinutes(-30));
        var placed = await PutAsync(reservation.AccessToken, (_corba, 2), (_kebap, 1));
        Assert.True(placed.IsSuccess, placed.Error);
        return reservation;
    }

    private OrderRequest PreOrderOf(Reservation reservation)
        => DbContext.OrderRequests.Where(r => r.ReservationId == reservation.Id).OrderByDescending(r => r.CreatedAt).First();

    // ── Pencere ─────────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Window_BeforeOpening_ShowsOpeningTimeAndRejectsPreOrder()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync();

        var detail = await GetAsync(reservation.AccessToken);
        var put = await PutAsync(reservation.AccessToken, (_corba, 1));

        Assert.True(detail.IsSuccess, detail.Error);
        Assert.False(detail.Value!.PreOrderWindow.CanPreOrder);
        Assert.Equal("13:00", detail.Value.PreOrderWindow.OpensAtTime);
        Assert.Equal("Ön siparişinizi 13:00'ten itibaren verebilirsiniz.", detail.Value.PreOrderWindow.Reason);
        Assert.False(put.IsSuccess);
        Assert.Empty(DbContext.OrderRequests.ToList());
    }

    [Fact]
    public async Task Window_DuringAndAfter()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync();

        At(ReservationAt.AddMinutes(-60));
        Assert.True((await GetAsync(reservation.AccessToken)).Value!.PreOrderWindow.CanPreOrder);
        At(ReservationAt.AddMinutes(30));
        Assert.True((await GetAsync(reservation.AccessToken)).Value!.PreOrderWindow.CanPreOrder);

        At(ReservationAt.AddMinutes(31));
        var after = await GetAsync(reservation.AccessToken);
        Assert.False(after.Value!.PreOrderWindow.CanPreOrder);
        Assert.Equal(PreOrderRules.WindowPassedMessage, after.Value.PreOrderWindow.Reason);
        Assert.False((await PutAsync(reservation.AccessToken, (_corba, 1))).IsSuccess);
    }

    [Fact]
    public async Task Window_NotConfirmed_IsClosed()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync(confirm: false);
        At(ReservationAt.AddMinutes(-30));

        var put = await PutAsync(reservation.AccessToken, (_corba, 1));

        Assert.False(put.IsSuccess);
        Assert.Equal(PreOrderRules.NotConfirmedMessage, put.Error);
    }

    [Fact]
    public async Task Window_PreOrderDisabledForBranch_IsClosed()
    {
        await SeedAsync(preOrderEnabled: false);
        Reservation reservation = await SeedReservationAsync();
        At(ReservationAt.AddMinutes(-30));

        var detail = await GetAsync(reservation.AccessToken);
        var put = await PutAsync(reservation.AccessToken, (_corba, 1));

        Assert.False(detail.Value!.PreOrderWindow.Enabled);
        Assert.False(put.IsSuccess);
        Assert.Equal(PreOrderRules.DisabledMessage, put.Error);
    }

    [Theory]
    [InlineData("18:30", "dan")]
    [InlineData("19:00", "dan")]
    [InlineData("20:00", "den")]
    [InlineData("20:15", "ten")]
    [InlineData("17:40", "tan")]
    [InlineData("13:00", "ten")]
    [InlineData("12:00", "den")]
    [InlineData("16:00", "dan")]
    [InlineData("21:50", "den")]
    public void AblativeSuffix_FollowsPronunciation(string time, string suffix)
        => Assert.Equal(suffix, PreOrderRules.AblativeSuffix(time));

    // ── Ver / değiştir / iptal ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task PreOrder_CreateReplaceCancel_UsesServerPrices()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync();
        At(ReservationAt.AddMinutes(-30));

        var created = await PutAsync(reservation.AccessToken, (_corba, 2));
        Assert.True(created.IsSuccess, created.Error);
        Assert.Equal(240m, created.Value!.PreOrder!.Total);
        Assert.Equal((int)OrderRequestStatus.Pending, created.Value.PreOrder.Status);
        Assert.True(created.Value.PreOrder.CanEdit);

        _kebap.Update(_kebap.Name, 350m, true, _kebap.CategoryId);
        await DbContext.SaveChangesAsync();
        var replaced = await PutAsync(reservation.AccessToken, (_kebap, 1), (_corba, 1));
        Assert.True(replaced.IsSuccess, replaced.Error);
        Assert.Equal(470m, replaced.Value!.PreOrder!.Total);

        OrderRequest single = Assert.Single(DbContext.OrderRequests.ToList());
        Assert.Equal(OrderRequestKind.PreOrder, single.Kind);
        Assert.Equal(2, DbContext.OrderRequestItems.Count(i => i.OrderRequestId == single.Id));
        Assert.Equal(350m, DbContext.OrderRequestItems.Single(i => i.ProductId == _kebap.Id).UnitPrice);

        var cancelled = await DeleteAsync(reservation.AccessToken);
        Assert.True(cancelled.IsSuccess, cancelled.Error);
        Assert.Equal((int)OrderRequestStatus.Cancelled, cancelled.Value!.PreOrder!.Status);
        Assert.False((await DeleteAsync(reservation.AccessToken)).IsSuccess);
    }

    [Fact]
    public async Task PreOrder_OutOfStockProduct_IsRejected()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync();
        _kebap.SetOutOfStock(true);
        await DbContext.SaveChangesAsync();
        At(ReservationAt.AddMinutes(-30));

        var detail = await GetAsync(reservation.AccessToken);
        var put = await PutAsync(reservation.AccessToken, (_kebap, 1));

        Assert.Contains(_kebap.Id, detail.Value!.OutOfStockProductIds);
        Assert.False(put.IsSuccess);
        Assert.Contains("tükendi", put.Error);
    }

    [Fact]
    public async Task PreOrder_IsNotInWaiterQrList()
    {
        await SeedAsync();
        await SeedWithPreOrderAsync();

        var list = await new GetPendingOrderRequestsQueryHandler(Db, CurrentUser).Handle(new GetPendingOrderRequestsQuery(), CancellationToken.None);
        var approve = await new ApproveOrderRequestCommandHandler(Db, CurrentUser, _tableNotifications, _cashierNotifications)
            .Handle(new ApproveOrderRequestCommand { Id = DbContext.OrderRequests.Single().Id }, CancellationToken.None);

        Assert.Empty(list.Value!);
        Assert.False(approve.IsSuccess);
        Assert.Empty(DbContext.Orders.ToList());
    }

    [Fact]
    public async Task TokenLookup_DoesNotLeakIds_AndMasksName()
    {
        await SeedAsync();
        Reservation reservation = await SeedWithPreOrderAsync();

        var detail = await GetAsync(reservation.AccessToken);
        string json = System.Text.Json.JsonSerializer.Serialize(detail.Value);

        Assert.Equal("Ahmet Y.", detail.Value!.GuestName);
        Assert.DoesNotContain(reservation.Id.ToString(), json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(PreOrderOf(reservation).Id.ToString(), json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(_table.Id.ToString(), json, StringComparison.OrdinalIgnoreCase);
        Assert.False((await GetAsync(new string('a', AccessToken.Length))).IsSuccess);
        Assert.False((await new GetReservationByTokenQueryHandler(Db, new FakeTenantResolver { Slug = "baska" }, _clock)
            .Handle(new GetReservationByTokenQuery { Token = reservation.AccessToken }, CancellationToken.None)).IsSuccess);
    }

    // ── Personel ────────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Seat_AppliesPreOrderAtSnapshotPrices_AndKitchenSeesIt()
    {
        await SeedAsync();
        Reservation reservation = await SeedWithPreOrderAsync();
        // Ön siparişten sonra fiyat değişse de masaya müşterinin gördüğü fiyat yazılır.
        _corba.Update(_corba.Name, 999m, true, _corba.CategoryId);
        await DbContext.SaveChangesAsync();
        At(ReservationAt.AddMinutes(5));

        var result = await ArrivalAsync(reservation, ReservationArrival.Seat);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(ReservationStatus.Seated, reservation.Status);
        Assert.Equal(TableStatus.Occupied, _table.Status);
        Order order = DbContext.Orders.Single();
        Assert.Equal(120m, order.OrderItems.Single(i => i.ProductId == _corba.Id).UnitPrice);
        Assert.Equal(540m, order.TotalPrice);
        Assert.StartsWith("Ön sipariş · Rezervasyon Ahmet Yılmaz 14:00", order.Note);
        Assert.Equal(OrderRequestStatus.Approved, PreOrderOf(reservation).Status);
        Assert.Single(_kitchenNotifications.OrdersChanged);

        var kitchen = await new GetAllOrdersToKitchenQueryHandler(Db, CurrentUser).Handle(new GetAllOrdersToKitchenQuery(), CancellationToken.None);
        Assert.Equal(3, Assert.Single(kitchen.Value!).OrderItems.Sum(i => i.Quantity));

        // Masaya oturunca müşteri artık değiştiremez.
        Assert.False((await PutAsync(reservation.AccessToken, (_corba, 1))).IsSuccess);
    }

    [Fact]
    public async Task Seat_WithoutPreOrder_OpensTable()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync();

        var result = await ArrivalAsync(reservation, ReservationArrival.Seat);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(TableStatus.Occupied, _table.Status);
        Assert.Empty(Assert.Single(DbContext.Orders.ToList()).OrderItems);
        Assert.Empty(_kitchenNotifications.OrdersChanged);
    }

    [Fact]
    public async Task FirePreOrder_SendsEarly_AndNeedsAPendingPreOrder()
    {
        await SeedAsync();
        Reservation withoutPreOrder = await SeedReservationAsync(startUtc: ReservationAt.AddHours(4));
        Reservation reservation = await SeedWithPreOrderAsync();

        Assert.False((await ArrivalAsync(withoutPreOrder, ReservationArrival.FirePreOrder)).IsSuccess);

        var result = await ArrivalAsync(reservation, ReservationArrival.FirePreOrder);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(ReservationStatus.Seated, reservation.Status);
        Assert.Equal(3, DbContext.Orders.Single().OrderItems.Sum(i => i.Quantity));
        Assert.Contains(DbContext.AuditLogs.ToList(), l => l.Action == "ReservationPreOrderFired");
    }

    [Fact]
    public async Task NoShow_CancelsPreOrder_OnlyAfterReservationTime()
    {
        await SeedAsync();
        Reservation reservation = await SeedWithPreOrderAsync();

        Assert.False((await ArrivalAsync(reservation, ReservationArrival.NoShow)).IsSuccess);

        At(ReservationAt.AddMinutes(20));
        var result = await ArrivalAsync(reservation, ReservationArrival.NoShow);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(ReservationStatus.NoShow, reservation.Status);
        Assert.Equal(OrderRequestStatus.Cancelled, PreOrderOf(reservation).Status);
        Assert.Empty(DbContext.Orders.ToList());
    }

    [Fact]
    public async Task CancelReservation_CascadesToPreOrder()
    {
        await SeedAsync();
        Reservation reservation = await SeedWithPreOrderAsync();

        var result = await DecideAsync(reservation, ReservationDecision.Cancel);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(OrderRequestStatus.Cancelled, PreOrderOf(reservation).Status);
        Assert.Contains(DbContext.AuditLogs.ToList(), l => l.Action == "ReservationCancel");
    }

    [Fact]
    public async Task RejectReservation_CascadesToPreOrder()
    {
        // Ön sipariş yalnızca onaylı rezervasyona verilir; ret yolunu sınamak için bekleyen rezervasyona doğrudan yazılır.
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync(confirm: false);
        Reservation confirmedTwin = Reservation.CreateRequest(_table, "x", "05551234567", ReservationAt.AddDays(3), ReservationAt.AddDays(3).AddHours(2), 2, null);
        confirmedTwin.Confirm();
        OrderRequest preOrder = OrderRequest.CreatePreOrder(confirmedTwin, null);
        typeof(OrderRequest).GetProperty(nameof(OrderRequest.ReservationId))!.SetValue(preOrder, reservation.Id);
        preOrder.AddItem(_corba, 1, null, 120m);
        DbContext.OrderRequests.Add(preOrder);
        await DbContext.SaveChangesAsync();

        var result = await DecideAsync(reservation, ReservationDecision.Reject);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(OrderRequestStatus.Cancelled, preOrder.Status);
    }

    [Fact]
    public async Task Seat_WaiterOutsideScope_IsDenied()
    {
        await SeedAsync();
        Reservation reservation = await SeedWithPreOrderAsync();
        Region terrace = await SeedRegionAsync();
        User waiterUser = User.Create("Garson Gül", "", "");
        DbContext.Users.Add(waiterUser);
        UserBranch membership = UserBranch.Create(waiterUser, _branch, "garsongul", null, UserRole.Waiter);
        membership.SetRegions([terrace.Id]);
        membership.SetWaiterPermissions(true, false, false, true, false);
        DbContext.UserBranches.Add(membership);
        await DbContext.SaveChangesAsync();
        var waiter = new FakeCurrentUserService { BranchId = CurrentUser.BranchId, CompanyId = CurrentUser.CompanyId, UserId = waiterUser.Id, Role = "Waiter" };

        var result = await ArrivalAsync(reservation, ReservationArrival.Seat, waiter);

        Assert.False(result.IsSuccess);
        Assert.Equal(StaffAccess.RegionDeniedMessage, result.Error);
        Assert.Equal(ReservationStatus.Confirmed, DbContext.Reservations.Single(r => r.Id == reservation.Id).Status);
        Assert.Empty(DbContext.Orders.ToList());
    }

    [Fact]
    public async Task StaffList_ShowsPreOrder()
    {
        await SeedAsync();
        Reservation reservation = await SeedWithPreOrderAsync();

        var list = await new GetCustomerReservationsQueryHandler(Db, CurrentUser).Handle(new GetCustomerReservationsQuery(), CancellationToken.None);

        StaffReservationDto row = Assert.Single(list.Value!);
        Assert.Equal(reservation.Id, row.Id);
        Assert.Equal(540m, row.PreOrder!.Total);
        Assert.Equal((int)OrderRequestStatus.Pending, row.PreOrder.Status);
        Assert.False(row.TableHasOpenOrder);
    }

    // ── Süre dolumu ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ExpirySweep_ExpiresUnseatedPreOrdersAfterThirtyMinutes()
    {
        await SeedAsync();
        Reservation reservation = await SeedWithPreOrderAsync();
        var sweeper = new DeliveryOrderSweeper(Db, _cashierNotifications, _tableNotifications);

        Assert.Equal(0, await sweeper.ExpirePreOrdersAsync(ReservationAt.AddMinutes(29), CancellationToken.None));
        Assert.Equal(1, await sweeper.ExpirePreOrdersAsync(ReservationAt.AddMinutes(31), CancellationToken.None));

        Assert.Equal(OrderRequestStatus.Expired, PreOrderOf(reservation).Status);
        Assert.Equal(ReservationStatus.Confirmed, reservation.Status); // "gelmedi" otomatik değildir
        Assert.Contains(DbContext.AuditLogs.ToList(), l => l.Action == "PreOrderExpired" && l.Message.Contains("gelmedi mi?"));
    }
}
