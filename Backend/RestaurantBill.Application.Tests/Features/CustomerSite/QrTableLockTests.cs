using Microsoft.Extensions.Caching.Memory;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Features.CustomerSite;
using RestaurantBill.Application.Features.CustomerSite.Public;
using RestaurantBill.Application.Features.CustomerSite.Staff;
using RestaurantBill.Application.Features.Orders.Commands.TransferOrder;
using RestaurantBill.Application.Features.Orders.Queries;
using RestaurantBill.Application.Features.Payments.Commands.CreatePayment;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.CustomerSite;

// Masa QR'ının "masa sahibi telefon" kuralı (QrTableLock): ilk talebi gönderen telefon masayı tutar, yalnız o sipariş
// verir ve hesabı görür; hesap kapanınca, talepler reddedilince ya da personel kilidi açınca bağ kalkar.
public class QrTableLockTests : ApplicationTestBase
{
    private const string Slug = "kilit-restoran";

    private static readonly string OtherHash = QrTableLock.HashToken("baska-telefon-000000002")!;

    private readonly FakeTenantResolver _tenant = new() { Slug = Slug };
    private readonly FakeTableNotificationService _tableNotifications = new();
    private readonly FakeCashierNotificationService _cashierNotifications = new();
    private readonly TableActionCooldown _cooldown = new(TimeProvider.System);
    private readonly ManualClock _clock = new();

    // UpdatedAt kayıtta gerçek saatle yazılır; saat gerçek andan başlar, süre dolmasını denemek için ileri alınır.
    private sealed class ManualClock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = DateTimeOffset.UtcNow;
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private Branch _branch = default!;
    private Table _table = default!;
    private Product _product = default!;

    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private async Task SeedAsync()
    {
        User owner = await SeedActorAsync("Yönetici");
        Company company = Company.Create("Kilit Restoran", owner);
        company.Slug = Slug;
        DbContext.Companies.Add(company);
        await DbContext.SaveChangesAsync();

        _branch = Branch.Create(company.Id, "Merkez", "", "", "", "İstanbul", "Fatih", "", 10m);
        SetId(_branch, CurrentUser.BranchId);
        DbContext.Branches.Add(_branch);
        await DbContext.SaveChangesAsync();

        _table = await SeedTableAsync();
        _product = Product.Create("Künefe", 220m, "", await DefaultCategoryIdAsync());
        DbContext.Products.Add(_product);
        await DbContext.SaveChangesAsync();
    }

    private Task<Result<OrderRequestStatusDto>> SendAsync(string? deviceHash, Guid? tableId = null)
        => new CreateOrderRequestCommandHandler(Db, _tenant, new OrderPricingService(Db), _tableNotifications).Handle(new CreateOrderRequestCommand
        {
            DeviceTokenHash = deviceHash,
            TableId = tableId ?? _table.Id,
            Items = [new OrderRequestItemInput { ProductId = _product.Id, Quantity = 1 }]
        }, CancellationToken.None);

    private Task<Result> ApproveAsync(Guid id)
        => new ApproveOrderRequestCommandHandler(Db, CurrentUser, _tableNotifications, _cashierNotifications)
            .Handle(new ApproveOrderRequestCommand { Id = id }, CancellationToken.None);

    private Task<Result> RejectAsync(Guid id)
        => new RejectOrderRequestCommandHandler(Db, CurrentUser, _tableNotifications)
            .Handle(new RejectOrderRequestCommand { Id = id }, CancellationToken.None);

    private Task<Result<PublicTableBillDto>> BillAsync(string? deviceHash, Guid? tableId = null)
        => new GetTableBillQueryHandler(Db, _tenant, _clock)
            .Handle(new GetTableBillQuery { TableId = tableId ?? _table.Id, DeviceTokenHash = deviceHash }, CancellationToken.None);

    private async Task<string> LockOfAsync(string? deviceHash, Guid? tableId = null)
    {
        var result = await new GetPublicTableQueryHandler(Db, _tenant, new MemoryCache(new MemoryCacheOptions()), TimeProvider.System)
            .Handle(new GetPublicTableQuery { TableId = tableId ?? _table.Id, DeviceTokenHash = deviceHash }, CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);
        return result.Value!.OrderLock;
    }

    private Task<Result<TableActionResultDto>> RequestBillAsync(string? deviceHash)
        => new RequestTableBillCommandHandler(Db, _tenant, _tableNotifications, _cashierNotifications, _cooldown, TimeProvider.System)
            .Handle(new RequestTableBillCommand { TableId = _table.Id, DeviceTokenHash = deviceHash }, CancellationToken.None);

    private Task<Result> UnlockAsync(ICurrentUserService? user = null, Guid? tableId = null)
        => new UnlockQrTableCommandHandler(Db, user ?? CurrentUser, _tableNotifications)
            .Handle(new UnlockQrTableCommand { TableId = tableId ?? _table.Id }, CancellationToken.None);

    // İlk talep gönderilir, garson onaylar: hesap açılır ve telefona bağlanır.
    private async Task<Order> OwnedOrderAsync(string deviceHash)
    {
        var sent = await SendAsync(deviceHash);
        Assert.True(sent.IsSuccess, sent.Error);
        var approved = await ApproveAsync(sent.Value!.Id);
        Assert.True(approved.IsSuccess, approved.Error);
        return DbContext.Orders.Single(o => o.TableId == _table.Id && o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled);
    }

    // ── Sahiplik ────────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task OpeningTheTablePage_DoesNotLock()
    {
        await SeedAsync();

        Assert.Equal("none", await LockOfAsync(DeviceHash));
        Assert.Equal("none", await LockOfAsync(OtherHash));
        Assert.Equal("none", await LockOfAsync(null));
        Assert.True((await SendAsync(OtherHash)).IsSuccess);
    }

    [Fact]
    public async Task FirstSender_BecomesOwner()
    {
        await SeedAsync();

        var result = await SendAsync(DeviceHash);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(DeviceHash, DbContext.OrderRequests.Single().DeviceTokenHash);
        Assert.Equal("mine", await LockOfAsync(DeviceHash));
        Assert.Equal("other", await LockOfAsync(OtherHash));
        Assert.Equal("other", await LockOfAsync(null));
        // Sahip telefon bir talep daha gönderebilir.
        Assert.True((await SendAsync(DeviceHash)).IsSuccess);
    }

    [Fact]
    public async Task SecondDevice_IsRejected_WithoutCreatingARequestOrNotifying()
    {
        await SeedAsync();
        Assert.True((await SendAsync(DeviceHash)).IsSuccess);
        int notificationsBefore = _tableNotifications.OrderRequestsCreated.Count;
        int changesBefore = _tableNotifications.CustomerRequestsChangedCount;

        var result = await SendAsync(OtherHash);

        Assert.False(result.IsSuccess);
        Assert.Equal(QrTableLock.OtherDeviceMessage, result.Error);
        Assert.Single(DbContext.OrderRequests.ToList());
        Assert.Equal(notificationsBefore, _tableNotifications.OrderRequestsCreated.Count);
        Assert.Equal(changesBefore, _tableNotifications.CustomerRequestsChangedCount);
    }

    [Fact]
    public async Task SecondDevice_IsRejected_AfterApproval_TooAndOrderIsBound()
    {
        await SeedAsync();
        Order order = await OwnedOrderAsync(DeviceHash);

        Assert.Equal(DeviceHash, order.QrOwnerTokenHash);
        var result = await SendAsync(OtherHash);

        Assert.False(result.IsSuccess);
        Assert.Equal(QrTableLock.OtherDeviceMessage, result.Error);
        Assert.Single(DbContext.OrderRequests.ToList());
    }

    [Fact]
    public async Task RequestWithoutDeviceToken_IsRejected()
    {
        await SeedAsync();

        var result = await SendAsync(null);

        Assert.False(result.IsSuccess);
        Assert.Equal(QrTableLock.MissingTokenMessage, result.Error);
        Assert.Empty(DbContext.OrderRequests.ToList());
    }

    [Fact]
    public async Task OwnerIsPerTable()
    {
        await SeedAsync();
        Table other = await SeedTableAsync();
        Assert.True((await SendAsync(DeviceHash)).IsSuccess);

        Assert.True((await SendAsync(OtherHash, other.Id)).IsSuccess);
        Assert.Equal("mine", await LockOfAsync(OtherHash, other.Id));
    }

    // ── Masanın hesabı ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Owner_SeesWholeBill_IncludingItemsTheWaiterAdded()
    {
        await SeedAsync();
        Order order = await OwnedOrderAsync(DeviceHash);
        Product ayran = Product.Create("Ayran", 45m, "", await DefaultCategoryIdAsync());
        DbContext.Products.Add(ayran);
        order.AddItem(ayran, 2);
        await DbContext.SaveChangesAsync();

        var bill = await BillAsync(DeviceHash);

        Assert.True(bill.IsSuccess, bill.Error);
        Assert.True(bill.Value!.HasBill);
        Assert.Equal(2, bill.Value.Items.Count);
        Assert.Contains(bill.Value.Items, i => i.Name == "Künefe" && i.Quantity == 1 && i.LineTotal == 220m);
        Assert.Contains(bill.Value.Items, i => i.Name == "Ayran" && i.Quantity == 2 && i.LineTotal == 90m);
        Assert.Equal(310m, bill.Value.Total);
        Assert.Equal(310m, bill.Value.Remaining);
    }

    [Fact]
    public async Task OtherDevices_GetNoBillData()
    {
        await SeedAsync();
        await OwnedOrderAsync(DeviceHash);

        var other = await BillAsync(OtherHash);
        var anonymous = await BillAsync(null);

        Assert.False(other.IsSuccess);
        Assert.Equal(QrTableLock.NotOwnerMessage, other.Error);
        Assert.Null(other.Value);
        Assert.False(anonymous.IsSuccess);
        Assert.Null(anonymous.Value);
    }

    [Fact]
    public async Task PendingOwner_OnOccupiedTable_DoesNotSeeTheBillUntilApproved()
    {
        await SeedAsync();
        // Masada garsonun açtığı hesap var; dışarıdan biri ilk talebi gönderiyor.
        Order order = Order.Create(_table.Id, CurrentUser.BranchId);
        order.AddItem(_product, 3);
        DbContext.Orders.Add(order);
        await DbContext.SaveChangesAsync();
        Assert.True((await SendAsync(DeviceHash)).IsSuccess);

        var bill = await BillAsync(DeviceHash);

        Assert.True(bill.IsSuccess, bill.Error);
        Assert.False(bill.Value!.HasBill);
        Assert.Empty(bill.Value.Items);
        Assert.Null(order.QrOwnerTokenHash);
    }

    [Fact]
    public async Task RequestBill_ReturnsTotal_OnlyToOwner()
    {
        await SeedAsync();
        await OwnedOrderAsync(DeviceHash);

        var other = await RequestBillAsync(OtherHash);
        Assert.True(other.IsSuccess, other.Error);
        Assert.True(other.Value!.Sent);
        Assert.Null(other.Value.BillTotal);

        // Bekleme süresindeki tekrar basışta da tutar yalnız sahibine.
        var owner = await RequestBillAsync(DeviceHash);
        Assert.True(owner.IsSuccess, owner.Error);
        Assert.False(owner.Value!.Sent);
        Assert.Equal(220m, owner.Value.BillTotal);

        var anonymous = await RequestBillAsync(null);
        Assert.Null(anonymous.Value!.BillTotal);
    }

    // ── Kilidin kalkması ────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Lock_IsReleased_WhenTheBillIsPaid()
    {
        await SeedAsync();
        Order order = await OwnedOrderAsync(DeviceHash);

        order.Close();
        await DbContext.SaveChangesAsync();

        Assert.Equal("none", await LockOfAsync(OtherHash));
        Assert.Equal("none", await LockOfAsync(DeviceHash));
        Assert.False((await BillAsync(OtherHash)).IsSuccess);
        Assert.True((await SendAsync(OtherHash)).IsSuccess);
        Assert.Equal("mine", await LockOfAsync(OtherHash));
    }

    [Fact]
    public async Task Lock_IsReleased_WhenTheOrderIsCancelled()
    {
        await SeedAsync();
        Order order = await OwnedOrderAsync(DeviceHash);

        order.Cancel();
        await DbContext.SaveChangesAsync();

        Assert.Equal("none", await LockOfAsync(OtherHash));
        Assert.True((await SendAsync(OtherHash)).IsSuccess);
    }

    [Fact]
    public async Task NewOrderOnTheSameTable_IsNotOwnedByThePreviousPhone()
    {
        await SeedAsync();
        Order order = await OwnedOrderAsync(DeviceHash);
        order.Close();
        // Garson sonraki misafirler için masayı açtı.
        DbContext.Orders.Add(Order.Create(_table.Id, CurrentUser.BranchId));
        await DbContext.SaveChangesAsync();

        Assert.Equal("none", await LockOfAsync(DeviceHash));
        // Önceki telefon yalnız kendi ödenen hesabını görür, yeni hesabı görmez.
        var bill = await BillAsync(DeviceHash);
        Assert.True(bill.IsSuccess, bill.Error);
        Assert.True(bill.Value!.IsPaid);
        Assert.Equal(220m, bill.Value.Total);
    }

    [Fact]
    public async Task Lock_IsReleased_WhenAllRequestsAreRejected_AndTableHasNoOpenOrder()
    {
        await SeedAsync();
        var first = await SendAsync(DeviceHash);
        var second = await SendAsync(DeviceHash);

        Assert.True((await RejectAsync(first.Value!.Id)).IsSuccess);
        Assert.Equal("other", await LockOfAsync(OtherHash));
        Assert.True((await RejectAsync(second.Value!.Id)).IsSuccess);

        Assert.Equal("none", await LockOfAsync(OtherHash));
        Assert.True((await SendAsync(OtherHash)).IsSuccess);
    }

    [Fact]
    public async Task Rejection_DoesNotRelease_WhenTheBillIsAlreadyBound()
    {
        await SeedAsync();
        await OwnedOrderAsync(DeviceHash);
        var later = await SendAsync(DeviceHash);

        Assert.True((await RejectAsync(later.Value!.Id)).IsSuccess);

        Assert.Equal("other", await LockOfAsync(OtherHash));
        Assert.True((await BillAsync(DeviceHash)).Value!.HasBill);
    }

    [Fact]
    public async Task ManualUnlock_ReleasesTheBillAndPendingClaim()
    {
        await SeedAsync();
        Order order = await OwnedOrderAsync(DeviceHash);
        await SendAsync(DeviceHash);

        var result = await UnlockAsync();

        Assert.True(result.IsSuccess, result.Error);
        Assert.Null(order.QrOwnerTokenHash);
        Assert.All(DbContext.OrderRequests.Where(r => r.Status == OrderRequestStatus.Pending).ToList(), r => Assert.Null(r.DeviceTokenHash));
        Assert.Equal("none", await LockOfAsync(OtherHash));
        Assert.False((await BillAsync(DeviceHash)).IsSuccess);
        Assert.Contains(DbContext.AuditLogs, a => a.Action == "QrTableUnlocked");
        Assert.True((await SendAsync(OtherHash)).IsSuccess);
    }

    [Fact]
    public async Task ManualUnlock_ByWaiterOutsideScope_IsDenied()
    {
        await SeedAsync();
        Order order = await OwnedOrderAsync(DeviceHash);
        Region terrace = await SeedRegionAsync();
        User waiterUser = User.Create("Garson Gül", "", "");
        DbContext.Users.Add(waiterUser);
        UserBranch membership = UserBranch.Create(waiterUser, _branch, "garsongul", null, UserRole.Waiter);
        membership.SetRegions([terrace.Id]);
        DbContext.UserBranches.Add(membership);
        await DbContext.SaveChangesAsync();
        var waiter = new FakeCurrentUserService { BranchId = CurrentUser.BranchId, CompanyId = CurrentUser.CompanyId, UserId = waiterUser.Id, Role = "Waiter" };

        var result = await UnlockAsync(waiter);

        Assert.False(result.IsSuccess);
        Assert.Equal(StaffAccess.RegionDeniedMessage, result.Error);
        Assert.Equal(DeviceHash, order.QrOwnerTokenHash);
    }

    [Fact]
    public async Task ManualUnlock_ByWaiterInScope_Succeeds()
    {
        await SeedAsync();
        Order order = await OwnedOrderAsync(DeviceHash);
        User waiterUser = User.Create("Garson Ali", "", "");
        DbContext.Users.Add(waiterUser);
        UserBranch membership = UserBranch.Create(waiterUser, _branch, "garsonali", null, UserRole.Waiter);
        membership.SetRegions([_table.RegionId]);
        DbContext.UserBranches.Add(membership);
        await DbContext.SaveChangesAsync();
        var waiter = new FakeCurrentUserService { BranchId = CurrentUser.BranchId, CompanyId = CurrentUser.CompanyId, UserId = waiterUser.Id, Role = "Waiter" };

        var result = await UnlockAsync(waiter);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Null(order.QrOwnerTokenHash);
    }

    // ── Masa taşıma ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task MovingTheOrder_TakesTheLockToTheDestinationTable()
    {
        await SeedAsync();
        await OwnedOrderAsync(DeviceHash);
        Table destination = await SeedTableAsync();

        var moved = await new TransferOrderCommandHandler(Db, new OrderQueries(Db), _tableNotifications, _cashierNotifications, CurrentUser)
            .Handle(new TransferOrderCommand { SourceTableId = _table.Id, DestinationTableId = destination.Id, Mode = TableTransferMode.Move }, CancellationToken.None);

        Assert.True(moved.IsSuccess, moved.Error);
        Assert.Equal("none", await LockOfAsync(OtherHash));
        Assert.Equal("mine", await LockOfAsync(DeviceHash, destination.Id));
        Assert.Equal("other", await LockOfAsync(OtherHash, destination.Id));
        Assert.True((await BillAsync(DeviceHash, destination.Id)).Value!.HasBill);
    }

    [Fact]
    public async Task MergingIntoAnotherTable_DropsTheSourcePhonesLock()
    {
        await SeedAsync();
        await OwnedOrderAsync(DeviceHash);
        Table destination = await SeedTableAsync();
        destination.Occupy();
        DbContext.Orders.Add(Order.Create(destination.Id, CurrentUser.BranchId));
        await DbContext.SaveChangesAsync();

        var merged = await new TransferOrderCommandHandler(Db, new OrderQueries(Db), _tableNotifications, _cashierNotifications, CurrentUser)
            .Handle(new TransferOrderCommand { SourceTableId = _table.Id, DestinationTableId = destination.Id, Mode = TableTransferMode.Merge }, CancellationToken.None);

        Assert.True(merged.IsSuccess, merged.Error);
        Assert.Equal("none", await LockOfAsync(OtherHash));
        // Birleşen hesap başka misafirlerin de hesabı: kaynak telefona geçmez.
        Assert.Equal("none", await LockOfAsync(DeviceHash, destination.Id));
        Assert.False((await BillAsync(DeviceHash, destination.Id)).IsSuccess);
    }

    // ── Ödenen hesap ────────────────────────────────────────────────────────────────────────────

    // Kasada "Tamamı" ile nakit ödeme: kalemler ödeme satırlarına yazılır, hesaptan silinir, hesap kapanır.
    private async Task PayAllAsync(Order order, decimal? discountAmount = null)
    {
        if (!DbContext.CashRegisters.Any())
        {
            CashRegister register = CashRegister.Create("Ana Kasa", 0m, _branch.Id);
            DbContext.CashRegisters.Add(register);
            DbContext.Shifts.Add(Shift.Create(_branch.Id, register.Id, CurrentUser.UserId, 0m, 0m));
            await DbContext.SaveChangesAsync();
        }

        var paid = await new CreatePaymentCommandHandler(Db, _tableNotifications, _cashierNotifications, CurrentUser)
            .Handle(new CreatePaymentCommand
            {
                OrderId = order.Id,
                CashRegisterId = DbContext.CashRegisters.Single().Id,
                PaymentMethod = PaymentMethod.Nakit,
                DiscountAmount = discountAmount,
                Items = order.OrderItems.Where(i => !i.IsSetMenuComponent)
                    .Select(i => new PaymentItemDto { OrderItemId = i.Id, Quantity = i.Quantity }).ToList(),
            }, CancellationToken.None);
        Assert.True(paid.IsSuccess, paid.Error);
        Assert.Equal(OrderStatus.Paid, DbContext.Orders.Single(o => o.Id == order.Id).Status);
    }

    private async Task<Order> OwnedOrderWithWaiterItemAsync()
    {
        Order order = await OwnedOrderAsync(DeviceHash);
        Product ayran = Product.Create("Ayran", 45m, "", await DefaultCategoryIdAsync());
        DbContext.Products.Add(ayran);
        order.AddItem(ayran, 2);
        await DbContext.SaveChangesAsync();
        return order;
    }

    [Fact]
    public async Task PaidBill_StaysVisibleToOwner_MarkedAsPaid()
    {
        await SeedAsync();
        Order order = await OwnedOrderWithWaiterItemAsync();

        await PayAllAsync(order);
        var bill = await BillAsync(DeviceHash);

        Assert.True(bill.IsSuccess, bill.Error);
        Assert.True(bill.Value!.HasBill);
        Assert.True(bill.Value.IsPaid);
        Assert.NotNull(bill.Value.PaidAt);
        Assert.Equal(2, bill.Value.Items.Count);
        Assert.Contains(bill.Value.Items, i => i.Name == "Künefe" && i.Quantity == 1 && i.LineTotal == 220m);
        Assert.Contains(bill.Value.Items, i => i.Name == "Ayran" && i.Quantity == 2 && i.LineTotal == 90m);
        Assert.Equal(310m, bill.Value.Total);
        Assert.Equal(310m, bill.Value.Paid);
        Assert.Equal(0m, bill.Value.Remaining);
        // Ödenen hesap masayı tutmaz.
        Assert.Equal("none", await LockOfAsync(DeviceHash));
        Assert.Equal("none", await LockOfAsync(OtherHash));
    }

    [Fact]
    public async Task PaidBill_ShowsDiscountAndCollectedAmount()
    {
        await SeedAsync();
        Order order = await OwnedOrderWithWaiterItemAsync();

        await PayAllAsync(order, discountAmount: 10m);
        var bill = (await BillAsync(DeviceHash)).Value!;

        Assert.True(bill.IsPaid);
        Assert.Equal(310m, bill.Total);
        Assert.Equal(10m, bill.Discount);
        Assert.Equal(300m, bill.Paid);
    }

    [Fact]
    public async Task PaidBill_IsNotVisibleToOtherPhones_AndDoesNotBlockThem()
    {
        await SeedAsync();
        Order order = await OwnedOrderAsync(DeviceHash);
        await PayAllAsync(order);

        var other = await BillAsync(OtherHash);
        Assert.False(other.IsSuccess);
        Assert.Null(other.Value);
        Assert.False((await BillAsync(null)).IsSuccess);

        // Yeni misafir masayı alır; önceki telefon yine yalnız kendi ödenen hesabını görür.
        Order next = await OwnedOrderAsync(OtherHash);
        Assert.Equal("mine", await LockOfAsync(OtherHash));
        Assert.Equal("other", await LockOfAsync(DeviceHash));
        var mine = await BillAsync(DeviceHash);
        Assert.True(mine.IsSuccess, mine.Error);
        Assert.True(mine.Value!.IsPaid);
        Assert.Equal(220m, mine.Value.Total);
        var theirs = await BillAsync(OtherHash);
        Assert.True(theirs.IsSuccess, theirs.Error);
        Assert.False(theirs.Value!.IsPaid);
        Assert.Equal(next.TotalPrice, theirs.Value.Total);
    }

    [Fact]
    public async Task SamePhone_CanOrderAgainAfterPaying_AndTheNewBillTakesOver()
    {
        await SeedAsync();
        Order order = await OwnedOrderAsync(DeviceHash);
        await PayAllAsync(order);

        var sent = await SendAsync(DeviceHash);
        Assert.True(sent.IsSuccess, sent.Error);
        Assert.Equal("mine", await LockOfAsync(DeviceHash));
        // Yeni talep onay beklerken ödenen hesap görünmeye devam eder.
        Assert.True((await BillAsync(DeviceHash)).Value!.IsPaid);

        Assert.True((await ApproveAsync(sent.Value!.Id)).IsSuccess);
        var bill = await BillAsync(DeviceHash);

        Assert.True(bill.IsSuccess, bill.Error);
        Assert.False(bill.Value!.IsPaid);
        Assert.Equal(220m, bill.Value.Remaining);
        // Önceki hesabın kapanış anı: telefon ondan önce onaylanan taleplerini "Ödendi" gösterir.
        Assert.NotNull(bill.Value.PaidAt);
    }

    [Fact]
    public async Task CancelledBill_IsNotShownAsPaid()
    {
        await SeedAsync();
        Order order = await OwnedOrderAsync(DeviceHash);

        order.Cancel();
        await DbContext.SaveChangesAsync();

        Assert.False((await BillAsync(DeviceHash)).IsSuccess);
    }

    [Fact]
    public async Task PaidBill_DisappearsAfterTheVisibilityWindow()
    {
        await SeedAsync();
        Order order = await OwnedOrderAsync(DeviceHash);
        await PayAllAsync(order);

        _clock.Now = DateTimeOffset.UtcNow + GetTableBillQueryHandler.PaidBillVisibleFor - TimeSpan.FromMinutes(5);
        Assert.True((await BillAsync(DeviceHash)).Value!.IsPaid);

        _clock.Now = DateTimeOffset.UtcNow + GetTableBillQueryHandler.PaidBillVisibleFor + TimeSpan.FromMinutes(5);
        var expired = await BillAsync(DeviceHash);
        Assert.False(expired.IsSuccess);
        Assert.Equal(QrTableLock.NotOwnerMessage, expired.Error);
    }

    // ── Garson çağır ────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CallWaiter_FromTableWithoutOpenOrder_CarriesTheEmptyFlag()
    {
        await SeedAsync();
        Table occupied = await SeedTableAsync();
        DbContext.Orders.Add(Order.Create(occupied.Id, CurrentUser.BranchId));
        await DbContext.SaveChangesAsync();
        var handler = new CallWaiterCommandHandler(Db, _tenant, _tableNotifications, _cooldown, TimeProvider.System);

        Assert.True((await handler.Handle(new CallWaiterCommand { TableId = _table.Id }, CancellationToken.None)).IsSuccess);
        Assert.True((await handler.Handle(new CallWaiterCommand { TableId = occupied.Id }, CancellationToken.None)).IsSuccess);

        Assert.True(_tableNotifications.WaiterCallsSent.Single(c => c.Payload.TableId == _table.Id).Payload.TableLooksEmpty);
        Assert.False(_tableNotifications.WaiterCallsSent.Single(c => c.Payload.TableId == occupied.Id).Payload.TableLooksEmpty);
    }
}
