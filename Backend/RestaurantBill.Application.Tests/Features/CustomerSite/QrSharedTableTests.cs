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
using RestaurantBill.Application.Features.Tables.Commands.SetTableQrLock;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.CustomerSite;

// Masa QR'ı paylaşımlı: masadaki her telefon sipariş verir (garson onayıyla) ve açık hesabı görür. Ödenen hesap yalnız
// o hesaba talebi yazılan telefonlarda bir süre "Ödendi" görünür. Personel masada QR siparişini kilitleyebilir.
public class QrSharedTableTests : ApplicationTestBase
{
    private const string Slug = "paylasim-restoran";

    private static readonly string OtherHash = QrTableAccess.HashToken("baska-telefon-000000002")!;
    private static readonly string NewcomerHash = QrTableAccess.HashToken("yeni-misafir-0000000003")!;

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
        Company company = Company.Create("Paylaşım Restoran", owner);
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

    private async Task<PublicTableInfoDto> TableInfoAsync()
    {
        var result = await new GetPublicTableQueryHandler(Db, _tenant, new MemoryCache(new MemoryCacheOptions()), TimeProvider.System)
            .Handle(new GetPublicTableQuery { TableId = _table.Id }, CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);
        return result.Value!;
    }

    private Task<Result<TableActionResultDto>> RequestBillAsync()
        => new RequestTableBillCommandHandler(Db, _tenant, _tableNotifications, _cashierNotifications, _cooldown, TimeProvider.System)
            .Handle(new RequestTableBillCommand { TableId = _table.Id }, CancellationToken.None);

    private Task<Result> SetLockAsync(bool locked, ICurrentUserService? user = null, Guid? tableId = null)
        => new SetTableQrLockCommandHandler(Db, user ?? CurrentUser, _tableNotifications)
            .Handle(new SetTableQrLockCommand { TableId = tableId ?? _table.Id, Locked = locked }, CancellationToken.None);

    // Telefon talep gönderir, garson onaylar.
    private async Task<Order> OrderFromAsync(string deviceHash)
    {
        var sent = await SendAsync(deviceHash);
        Assert.True(sent.IsSuccess, sent.Error);
        var approved = await ApproveAsync(sent.Value!.Id);
        Assert.True(approved.IsSuccess, approved.Error);
        return DbContext.Orders.Single(o => o.TableId == _table.Id && o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled);
    }

    private async Task<FakeCurrentUserService> SeedStaffAsync(UserRole role, Action<UserBranch>? configure = null, Guid[]? regionIds = null)
    {
        User user = User.Create($"Personel {role}", "", "");
        DbContext.Users.Add(user);
        UserBranch membership = UserBranch.Create(user, _branch, $"personel{Guid.NewGuid():N}"[..20], null, role);
        if (regionIds is not null)
            membership.SetRegions(regionIds);
        configure?.Invoke(membership);
        DbContext.UserBranches.Add(membership);
        await DbContext.SaveChangesAsync();
        return new FakeCurrentUserService { BranchId = CurrentUser.BranchId, CompanyId = CurrentUser.CompanyId, UserId = user.Id, Role = role.ToString() };
    }

    private static Action<UserBranch> WaiterWithLockQr(bool canLockQr)
        => m => m.SetWaiterPermissions(canTakeOrders: true, canTakePayment: false, canCancelAndDiscount: false, canTransferAndReserve: false, canLockQr: canLockQr);

    // ── Paylaşımlı sipariş ──────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task TwoDevices_CanBothOrder_OnTheSameTable()
    {
        await SeedAsync();

        var first = await SendAsync(DeviceHash);
        var second = await SendAsync(OtherHash);

        Assert.True(first.IsSuccess, first.Error);
        Assert.True(second.IsSuccess, second.Error);
        Assert.Equal(2, DbContext.OrderRequests.Count());
        Assert.Contains(DbContext.OrderRequests, r => r.DeviceTokenHash == DeviceHash);
        Assert.Contains(DbContext.OrderRequests, r => r.DeviceTokenHash == OtherHash);

        Assert.True((await ApproveAsync(first.Value!.Id)).IsSuccess);
        Assert.True((await ApproveAsync(second.Value!.Id)).IsSuccess);
        Order order = DbContext.Orders.Single(o => o.TableId == _table.Id);
        Assert.Equal(440m, order.TotalPrice);
        Assert.All(DbContext.OrderRequests.ToList(), r => Assert.Equal(order.Id, r.OrderId));
    }

    [Fact]
    public async Task SecondDevice_CanOrder_AfterTheFirstIsApproved()
    {
        await SeedAsync();
        await OrderFromAsync(DeviceHash);

        var result = await SendAsync(OtherHash);

        Assert.True(result.IsSuccess, result.Error);
    }

    [Fact]
    public async Task RequestWithoutDeviceToken_IsRejected()
    {
        await SeedAsync();

        var result = await SendAsync(null);

        Assert.False(result.IsSuccess);
        Assert.Equal(QrTableAccess.MissingTokenMessage, result.Error);
        Assert.Empty(DbContext.OrderRequests.ToList());
    }

    [Fact]
    public async Task PendingLimit_StillAppliesPerTable_AcrossDevices()
    {
        await SeedAsync();
        for (int i = 0; i < CustomerSiteScope.MaxPendingOrderRequestsPerTable; i++)
            Assert.True((await SendAsync(i % 2 == 0 ? DeviceHash : OtherHash)).IsSuccess);

        var result = await SendAsync(NewcomerHash);

        Assert.False(result.IsSuccess);
        Assert.Equal(CustomerSiteScope.MaxPendingOrderRequestsPerTable, DbContext.OrderRequests.Count());
    }

    [Fact]
    public async Task PublicTableInfo_ExposesQrOrderingLocked()
    {
        await SeedAsync();
        Assert.False((await TableInfoAsync()).QrOrderingLocked);

        Assert.True((await SetLockAsync(true)).IsSuccess);

        Assert.True((await TableInfoAsync()).QrOrderingLocked);
    }

    // ── Paylaşımlı hesap ────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task EveryDevice_SeesTheOpenBill_IncludingItemsTheWaiterAdded()
    {
        await SeedAsync();
        Order order = await OrderFromAsync(DeviceHash);
        Product ayran = Product.Create("Ayran", 45m, "", await DefaultCategoryIdAsync());
        DbContext.Products.Add(ayran);
        order.AddItem(ayran, 2);
        await DbContext.SaveChangesAsync();

        foreach (string? hash in new[] { DeviceHash, OtherHash, null })
        {
            var bill = await BillAsync(hash);
            Assert.True(bill.IsSuccess, bill.Error);
            Assert.True(bill.Value!.HasBill);
            Assert.False(bill.Value.IsPaid);
            Assert.Equal(2, bill.Value.Items.Count);
            Assert.Contains(bill.Value.Items, i => i.Name == "Künefe" && i.Quantity == 1 && i.LineTotal == 220m);
            Assert.Contains(bill.Value.Items, i => i.Name == "Ayran" && i.Quantity == 2 && i.LineTotal == 90m);
            Assert.Equal(310m, bill.Value.Total);
            Assert.Equal(310m, bill.Value.Remaining);
        }
    }

    [Fact]
    public async Task TableWithoutOpenBill_ReturnsNoBill()
    {
        await SeedAsync();
        Assert.True((await SendAsync(DeviceHash)).IsSuccess);

        var bill = await BillAsync(DeviceHash);

        Assert.True(bill.IsSuccess, bill.Error);
        Assert.False(bill.Value!.HasBill);
        Assert.Empty(bill.Value.Items);
    }

    [Fact]
    public async Task RequestBill_ReturnsTheRemaining_ToEveryDevice()
    {
        await SeedAsync();
        await OrderFromAsync(DeviceHash);

        var first = await RequestBillAsync();
        var again = await RequestBillAsync();

        Assert.True(first.IsSuccess, first.Error);
        Assert.True(first.Value!.Sent);
        Assert.Equal(220m, first.Value.BillTotal);
        Assert.False(again.Value!.Sent);
        Assert.Equal(220m, again.Value.BillTotal);
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

    [Fact]
    public async Task PaidBill_IsVisibleToEveryParticipant_MarkedAsPaid()
    {
        await SeedAsync();
        var first = await SendAsync(DeviceHash);
        var second = await SendAsync(OtherHash);
        Assert.True((await ApproveAsync(first.Value!.Id)).IsSuccess);
        Assert.True((await ApproveAsync(second.Value!.Id)).IsSuccess);
        Order order = DbContext.Orders.Single(o => o.TableId == _table.Id);
        Product ayran = Product.Create("Ayran", 45m, "", await DefaultCategoryIdAsync());
        DbContext.Products.Add(ayran);
        order.AddItem(ayran, 2);
        await DbContext.SaveChangesAsync();

        await PayAllAsync(order, discountAmount: 10m);

        foreach (string hash in new[] { DeviceHash, OtherHash })
        {
            var bill = await BillAsync(hash);
            Assert.True(bill.IsSuccess, bill.Error);
            Assert.True(bill.Value!.HasBill);
            Assert.True(bill.Value.IsPaid);
            Assert.NotNull(bill.Value.PaidAt);
            Assert.Contains(bill.Value.Items, i => i.Name == "Künefe" && i.Quantity == 2 && i.LineTotal == 440m);
            Assert.Contains(bill.Value.Items, i => i.Name == "Ayran" && i.Quantity == 2 && i.LineTotal == 90m);
            Assert.Equal(530m, bill.Value.Total);
            Assert.Equal(10m, bill.Value.Discount);
            Assert.Equal(520m, bill.Value.Paid);
            Assert.Equal(0m, bill.Value.Remaining);
        }
    }

    [Fact]
    public async Task PaidBill_IsNotShown_ToNonParticipants()
    {
        await SeedAsync();
        Order order = await OrderFromAsync(DeviceHash);
        // Bu telefonun talebi reddedildi: hesaba katılmadı.
        var rejected = await SendAsync(OtherHash);
        Assert.True((await RejectAsync(rejected.Value!.Id)).IsSuccess);

        await PayAllAsync(order);

        foreach (string? hash in new[] { OtherHash, NewcomerHash, null })
        {
            var bill = await BillAsync(hash);
            Assert.True(bill.IsSuccess, bill.Error);
            Assert.False(bill.Value!.HasBill);
            Assert.Empty(bill.Value.Items);
        }
    }

    [Fact]
    public async Task NextParty_DoesNotSeeThePreviousPartysBill_AndTheirNewBillTakesOver()
    {
        await SeedAsync();
        Order previous = await OrderFromAsync(DeviceHash);
        await PayAllAsync(previous);

        // Sonraki misafirler masaya oturdu ve sipariş verdi.
        Order next = await OrderFromAsync(NewcomerHash);

        var newcomer = await BillAsync(NewcomerHash);
        Assert.True(newcomer.IsSuccess, newcomer.Error);
        Assert.False(newcomer.Value!.IsPaid);
        Assert.Equal(next.TotalPrice, newcomer.Value.Total);
        // Yeni telefonun ödenen hesabı yok: önceki kapanış anı da gitmez.
        Assert.Null(newcomer.Value.PaidAt);

        // Önceki telefon masadaki açık hesabı görür (masadaki herkes gibi); kendi kapanış anı ayrıca gelir.
        var previousPhone = await BillAsync(DeviceHash);
        Assert.False(previousPhone.Value!.IsPaid);
        Assert.NotNull(previousPhone.Value.PaidAt);
    }

    [Fact]
    public async Task CancelledBill_IsNotShownAsPaid()
    {
        await SeedAsync();
        Order order = await OrderFromAsync(DeviceHash);

        order.Cancel();
        await DbContext.SaveChangesAsync();

        var bill = await BillAsync(DeviceHash);
        Assert.True(bill.IsSuccess, bill.Error);
        Assert.False(bill.Value!.HasBill);
    }

    [Fact]
    public async Task PaidBill_DisappearsAfterTheVisibilityWindow()
    {
        await SeedAsync();
        Order order = await OrderFromAsync(DeviceHash);
        await PayAllAsync(order);

        _clock.Now = DateTimeOffset.UtcNow + GetTableBillQueryHandler.PaidBillVisibleFor - TimeSpan.FromMinutes(5);
        Assert.True((await BillAsync(DeviceHash)).Value!.IsPaid);

        _clock.Now = DateTimeOffset.UtcNow + GetTableBillQueryHandler.PaidBillVisibleFor + TimeSpan.FromMinutes(5);
        var expired = await BillAsync(DeviceHash);
        Assert.True(expired.IsSuccess, expired.Error);
        Assert.False(expired.Value!.HasBill);
    }

    [Fact]
    public async Task MovingTheOrder_TakesTheBillAndParticipantsToTheDestinationTable()
    {
        await SeedAsync();
        Order order = await OrderFromAsync(DeviceHash);
        Table destination = await SeedTableAsync();

        var moved = await new TransferOrderCommandHandler(Db, new OrderQueries(Db), _tableNotifications, _cashierNotifications, CurrentUser)
            .Handle(new TransferOrderCommand { SourceTableId = _table.Id, DestinationTableId = destination.Id, Mode = TableTransferMode.Move }, CancellationToken.None);

        Assert.True(moved.IsSuccess, moved.Error);
        Assert.False((await BillAsync(DeviceHash)).Value!.HasBill);
        Assert.True((await BillAsync(OtherHash, destination.Id)).Value!.HasBill);

        await PayAllAsync(order);
        Assert.True((await BillAsync(DeviceHash, destination.Id)).Value!.IsPaid);
    }

    [Fact]
    public async Task MergingIntoAnotherTable_MakesSourcePhonesParticipantsOfTheMergedBill()
    {
        await SeedAsync();
        await OrderFromAsync(DeviceHash);
        Table destination = await SeedTableAsync();
        destination.Occupy();
        Order target = Order.Create(destination.Id, CurrentUser.BranchId);
        DbContext.Orders.Add(target);
        await DbContext.SaveChangesAsync();

        var merged = await new TransferOrderCommandHandler(Db, new OrderQueries(Db), _tableNotifications, _cashierNotifications, CurrentUser)
            .Handle(new TransferOrderCommand { SourceTableId = _table.Id, DestinationTableId = destination.Id, Mode = TableTransferMode.Merge }, CancellationToken.None);

        Assert.True(merged.IsSuccess, merged.Error);
        Assert.Equal(target.Id, DbContext.OrderRequests.Single().OrderId);

        await PayAllAsync(DbContext.Orders.Single(o => o.Id == target.Id));
        var bill = await BillAsync(DeviceHash, destination.Id);
        Assert.True(bill.Value!.IsPaid);
        Assert.Equal(220m, bill.Value.Total);
    }

    // ── Personelin QR kilidi ────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Lock_BlocksQrRequests_WithoutCreatingOrNotifying()
    {
        await SeedAsync();
        Assert.True((await SetLockAsync(true)).IsSuccess);
        int createdBefore = _tableNotifications.OrderRequestsCreated.Count;

        var result = await SendAsync(DeviceHash);

        Assert.False(result.IsSuccess);
        Assert.Equal(QrTableAccess.OrderingLockedMessage, result.Error);
        Assert.Empty(DbContext.OrderRequests.ToList());
        Assert.Equal(createdBefore, _tableNotifications.OrderRequestsCreated.Count);
    }

    [Fact]
    public async Task Lock_KeepsTheBillAndBillRequestWorking()
    {
        await SeedAsync();
        await OrderFromAsync(DeviceHash);
        Assert.True((await SetLockAsync(true)).IsSuccess);

        var bill = (await BillAsync(OtherHash)).Value!;
        Assert.True(bill.HasBill);
        Assert.True(bill.QrOrderingLocked);
        Assert.True((await RequestBillAsync()).Value!.Sent);
    }

    [Fact]
    public async Task Unlock_AllowsQrRequestsAgain()
    {
        await SeedAsync();
        Assert.True((await SetLockAsync(true)).IsSuccess);
        Assert.False((await SendAsync(DeviceHash)).IsSuccess);

        Assert.True((await SetLockAsync(false)).IsSuccess);

        Assert.True((await SendAsync(DeviceHash)).IsSuccess);
        Assert.False(DbContext.Tables.Single(t => t.Id == _table.Id).QrOrderingLocked);
    }

    [Fact]
    public async Task Lock_IsPerTable()
    {
        await SeedAsync();
        Table other = await SeedTableAsync();
        Assert.True((await SetLockAsync(true)).IsSuccess);

        Assert.True((await SendAsync(DeviceHash, other.Id)).IsSuccess);
    }

    [Fact]
    public async Task Lock_WritesAuditLog_AndNotifiesStaffScreens()
    {
        await SeedAsync();

        Assert.True((await SetLockAsync(true)).IsSuccess);
        Assert.True((await SetLockAsync(false)).IsSuccess);

        Assert.Contains(DbContext.AuditLogs, a => a.Action == "QrOrderingLocked" && a.EntityId == _table.Id);
        Assert.Contains(DbContext.AuditLogs, a => a.Action == "QrOrderingUnlocked" && a.EntityId == _table.Id);
        Assert.Equal([(_table.Id, true), (_table.Id, false)], _tableNotifications.QrLockChanges);
    }

    [Fact]
    public async Task Lock_SameStateAgain_IsANoOp()
    {
        await SeedAsync();
        Assert.True((await SetLockAsync(true)).IsSuccess);

        Assert.True((await SetLockAsync(true)).IsSuccess);

        Assert.Single(DbContext.AuditLogs.Where(a => a.Action == "QrOrderingLocked").ToList());
        Assert.Single(_tableNotifications.QrLockChanges);
    }

    [Fact]
    public async Task Lock_ByOwner_Succeeds()
    {
        await SeedAsync();
        var owner = new FakeCurrentUserService { BranchId = CurrentUser.BranchId, CompanyId = CurrentUser.CompanyId, UserId = CurrentUser.UserId, Role = "Owner" };

        Assert.True((await SetLockAsync(true, owner)).IsSuccess);
        Assert.True(DbContext.Tables.Single(t => t.Id == _table.Id).QrOrderingLocked);
    }

    [Fact]
    public async Task Lock_ByAdmin_Succeeds()
    {
        await SeedAsync();

        Assert.True((await SetLockAsync(true)).IsSuccess);
        Assert.True(DbContext.Tables.Single(t => t.Id == _table.Id).QrOrderingLocked);
    }

    [Fact]
    public async Task Lock_ByWaiterWithoutLockQr_IsDenied()
    {
        await SeedAsync();
        FakeCurrentUserService waiter = await SeedStaffAsync(UserRole.Waiter, WaiterWithLockQr(false));

        var result = await SetLockAsync(true, waiter);

        Assert.False(result.IsSuccess);
        Assert.Equal(StaffAccess.QrLockDeniedMessage, result.Error);
        Assert.False(DbContext.Tables.Single(t => t.Id == _table.Id).QrOrderingLocked);
    }

    [Fact]
    public async Task NewWaiter_HasNoLockQrPermission_ByDefault()
    {
        await SeedAsync();
        FakeCurrentUserService waiter = await SeedStaffAsync(UserRole.Waiter);

        Assert.False((await SetLockAsync(true, waiter)).IsSuccess);
    }

    [Fact]
    public async Task Lock_ByWaiterWithLockQr_Succeeds()
    {
        await SeedAsync();
        FakeCurrentUserService waiter = await SeedStaffAsync(UserRole.Waiter, WaiterWithLockQr(true));

        var result = await SetLockAsync(true, waiter);

        Assert.True(result.IsSuccess, result.Error);
        Assert.True(DbContext.Tables.Single(t => t.Id == _table.Id).QrOrderingLocked);
    }

    [Fact]
    public async Task Lock_ByWaiterWithLockQr_OutsideScope_IsDenied()
    {
        await SeedAsync();
        Region terrace = await SeedRegionAsync();
        FakeCurrentUserService waiter = await SeedStaffAsync(UserRole.Waiter, WaiterWithLockQr(true), [terrace.Id]);

        var result = await SetLockAsync(true, waiter);

        Assert.False(result.IsSuccess);
        Assert.Equal(StaffAccess.RegionDeniedMessage, result.Error);
    }

    [Theory]
    [InlineData(UserRole.Cashier)]
    [InlineData(UserRole.Kitchen)]
    [InlineData(UserRole.Courier)]
    public async Task Lock_ByOtherRoles_IsDenied(UserRole role)
    {
        await SeedAsync();
        FakeCurrentUserService staff = await SeedStaffAsync(role);

        var result = await SetLockAsync(true, staff);

        Assert.False(result.IsSuccess);
        Assert.Equal(StaffAccess.QrLockDeniedMessage, result.Error);
        Assert.Empty(DbContext.AuditLogs.Where(a => a.Action == "QrOrderingLocked").ToList());
    }

    [Fact]
    public async Task Lock_OnUnknownTable_Fails()
    {
        await SeedAsync();

        var result = await SetLockAsync(true, tableId: Guid.NewGuid());

        Assert.False(result.IsSuccess);
        Assert.Equal(SetTableQrLockCommandHandler.TableNotFoundMessage, result.Error);
    }

    [Fact]
    public async Task StaffTableDto_CarriesTheLock()
    {
        await SeedAsync();
        Assert.True((await SetLockAsync(true)).IsSuccess);

        var tables = await new RestaurantBill.Application.Features.Tables.Queries.GetAllTable.GetAllTableQueryHandler(Db, CurrentUser)
            .Handle(new RestaurantBill.Application.Features.Tables.Queries.GetAllTable.GetAllTableQuery(), CancellationToken.None);

        Assert.True(tables.IsSuccess, tables.Error);
        Assert.True(tables.Value!.Single(t => t.Id == _table.Id).QrOrderingLocked);
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
