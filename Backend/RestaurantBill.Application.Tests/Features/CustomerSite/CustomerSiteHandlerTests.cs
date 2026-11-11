using System.Globalization;
using RestaurantBill.Application.Features.CustomerSite.Public;
using RestaurantBill.Application.Features.CustomerSite.Staff;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.CustomerSite;

public class CustomerSiteHandlerTests : ApplicationTestBase
{
    private const string Slug = "test-restoran";

    private readonly FakeTenantResolver _tenant = new() { Slug = Slug };
    private readonly FakeTableNotificationService _tableNotifications = new();
    private readonly FakeCashierNotificationService _cashierNotifications = new();

    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    // Şirket (slug) → şube (CurrentUser.BranchId) → bölge → masa + kategori → ürün.
    private async Task<(Table Table, Product Product)> SeedRestaurantAsync()
    {
        User owner = await SeedActorAsync();
        Company company = Company.Create("Test Restoran", owner);
        company.Slug = Slug;
        DbContext.Companies.Add(company);
        await DbContext.SaveChangesAsync();

        Branch branch = Branch.Create(company.Id, "Merkez", "", "", "", "İstanbul", "Fatih", "", 10m);
        SetId(branch, CurrentUser.BranchId);
        DbContext.Branches.Add(branch);
        await DbContext.SaveChangesAsync();

        Table table = await SeedTableAsync();
        Product product = Product.Create("Mercimek Çorbası", 120m, "", await DefaultCategoryIdAsync());
        DbContext.Products.Add(product);
        await DbContext.SaveChangesAsync();

        return (table, product);
    }

    private async Task<Guid> SendOrderRequestAsync(Table table, Product product, int quantity = 2)
    {
        var handler = new CreateOrderRequestCommandHandler(Db, _tenant, _tableNotifications);
        var result = await handler.Handle(new CreateOrderRequestCommand
        {
            TableId = table.Id,
            Items = [new OrderRequestItemInput { ProductId = product.Id, Quantity = quantity, Note = "az tuzlu" }]
        }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        return result.Value!.Id;
    }

    private ApproveOrderRequestCommandHandler ApproveHandler()
        => new(Db, CurrentUser, _tableNotifications, _cashierNotifications);

    private static string DaysFromNow(int days)
        => DateTime.UtcNow.AddDays(days).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private CreateReservationRequestCommand ReservationCommand(Table table, string time, int daysAhead = 2) => new()
    {
        TableId = table.Id,
        GuestName = "Ahmet Yılmaz",
        Contact = "0555 123 45 67",
        Date = DaysFromNow(daysAhead),
        Time = time,
        PartySize = 4
    };

    [Fact]
    public async Task CreateOrderRequest_StaysPendingAndDoesNotOpenTheTable()
    {
        var (table, product) = await SeedRestaurantAsync();

        Guid id = await SendOrderRequestAsync(table, product);

        OrderRequest saved = DbContext.OrderRequests.Single(r => r.Id == id);
        Assert.Equal(OrderRequestStatus.Pending, saved.Status);
        Assert.Empty(DbContext.Orders.ToList());
        Assert.Equal(TableStatus.Available, table.Status);
        Assert.Equal(1, _tableNotifications.CustomerRequestsChangedCount);
    }

    [Fact]
    public async Task CreateOrderRequest_WithProductFromAnotherBranch_Fails()
    {
        var (table, _) = await SeedRestaurantAsync();
        Category otherCategory = await SeedCategoryAsync(Guid.NewGuid());
        Product otherProduct = Product.Create("Yabancı Ürün", 50m, "", otherCategory.Id);
        DbContext.Products.Add(otherProduct);
        await DbContext.SaveChangesAsync();

        var handler = new CreateOrderRequestCommandHandler(Db, _tenant, _tableNotifications);
        var result = await handler.Handle(new CreateOrderRequestCommand
        {
            TableId = table.Id,
            Items = [new OrderRequestItemInput { ProductId = otherProduct.Id, Quantity = 1 }]
        }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Empty(DbContext.OrderRequests.ToList());
    }

    [Fact]
    public async Task CreateOrderRequest_WithUnknownSlug_Fails()
    {
        var (table, product) = await SeedRestaurantAsync();

        var handler = new CreateOrderRequestCommandHandler(Db, new FakeTenantResolver { Slug = "baska-restoran" }, _tableNotifications);
        var result = await handler.Handle(new CreateOrderRequestCommand
        {
            TableId = table.Id,
            Items = [new OrderRequestItemInput { ProductId = product.Id, Quantity = 1 }]
        }, CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task ApproveOrderRequest_OnEmptyTable_OpensOrderAndAddsItems()
    {
        var (table, product) = await SeedRestaurantAsync();
        Guid id = await SendOrderRequestAsync(table, product, quantity: 2);

        var result = await ApproveHandler().Handle(new ApproveOrderRequestCommand { Id = id }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Order order = DbContext.Orders.Single();
        OrderItem item = Assert.Single(order.OrderItems);
        Assert.Equal(product.Id, item.ProductId);
        Assert.Equal(2, item.Quantity);
        Assert.Equal("az tuzlu", item.Note);
        Assert.Equal(10m, item.TaxRate);
        Assert.Equal(240m, order.TotalPrice);
        Assert.Equal(TableStatus.Occupied, table.Status);
        Assert.Equal(OrderRequestStatus.Approved, DbContext.OrderRequests.Single().Status);
    }

    [Fact]
    public async Task ApproveOrderRequest_OnTableWithActiveOrder_AddsToThatOrder()
    {
        var (table, product) = await SeedRestaurantAsync();
        table.Occupy();
        Order existing = Order.Create(table.Id);
        existing.AddItem(product, 1);
        DbContext.Orders.Add(existing);
        await DbContext.SaveChangesAsync();

        Guid id = await SendOrderRequestAsync(table, product, quantity: 3);
        var result = await ApproveHandler().Handle(new ApproveOrderRequestCommand { Id = id }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Order order = Assert.Single(DbContext.Orders.ToList());
        Assert.Equal(4, order.OrderItems.Sum(i => i.Quantity));
    }

    [Fact]
    public async Task ApproveOrderRequest_Twice_FailsSecondTime()
    {
        var (table, product) = await SeedRestaurantAsync();
        Guid id = await SendOrderRequestAsync(table, product);

        await ApproveHandler().Handle(new ApproveOrderRequestCommand { Id = id }, CancellationToken.None);
        var second = await ApproveHandler().Handle(new ApproveOrderRequestCommand { Id = id }, CancellationToken.None);

        Assert.False(second.IsSuccess);
        Assert.Single(DbContext.Orders.ToList());
    }

    [Fact]
    public async Task RejectOrderRequest_MarksRejectedWithoutOrder()
    {
        var (table, product) = await SeedRestaurantAsync();
        Guid id = await SendOrderRequestAsync(table, product);

        var handler = new RejectOrderRequestCommandHandler(Db, CurrentUser, _tableNotifications);
        var result = await handler.Handle(new RejectOrderRequestCommand { Id = id }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(OrderRequestStatus.Rejected, DbContext.OrderRequests.Single().Status);
        Assert.Empty(DbContext.Orders.ToList());
    }

    [Fact]
    public async Task CreateReservationRequest_IsPendingWithTwoHourSlotAndLeavesTableAvailable()
    {
        var (table, _) = await SeedRestaurantAsync();
        var handler = new CreateReservationRequestCommandHandler(Db, _tenant, _tableNotifications);

        var result = await handler.Handle(ReservationCommand(table, "19:00"), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal("19:00", result.Value!.Time);
        Assert.Equal("21:00", result.Value.EndTime);
        Reservation saved = DbContext.Reservations.Single();
        Assert.Equal(ReservationStatus.Pending, saved.Status);
        Assert.Equal(TimeSpan.FromHours(2), saved.EndTime!.Value - saved.ReservationTime);
        // İstanbul UTC+3: 19:00 yerel = 16:00 UTC.
        Assert.Equal(16, saved.ReservationTime.Hour);
        Assert.Equal(TableStatus.Available, table.Status);
    }

    [Fact]
    public async Task CreateReservationRequest_OverlappingSlotOnSameTable_IsRejected()
    {
        var (table, _) = await SeedRestaurantAsync();
        var handler = new CreateReservationRequestCommandHandler(Db, _tenant, _tableNotifications);
        await handler.Handle(ReservationCommand(table, "19:00"), CancellationToken.None);

        var overlapping = await handler.Handle(ReservationCommand(table, "20:30"), CancellationToken.None);
        var adjacent = await handler.Handle(ReservationCommand(table, "21:00"), CancellationToken.None);

        Assert.False(overlapping.IsSuccess);
        Assert.True(adjacent.IsSuccess, adjacent.Error);
        Assert.Equal(2, DbContext.Reservations.Count());
    }

    [Fact]
    public async Task CreateReservationRequest_InThePast_IsRejected()
    {
        var (table, _) = await SeedRestaurantAsync();
        var handler = new CreateReservationRequestCommandHandler(Db, _tenant, _tableNotifications);

        var result = await handler.Handle(ReservationCommand(table, "19:00", daysAhead: -1), CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Availability_ListsTablesBookedInTheSlot()
    {
        var (table, _) = await SeedRestaurantAsync();
        await new CreateReservationRequestCommandHandler(Db, _tenant, _tableNotifications)
            .Handle(ReservationCommand(table, "19:00"), CancellationToken.None);

        var handler = new GetReservationAvailabilityQueryHandler(Db, _tenant);
        var busy = await handler.Handle(new GetReservationAvailabilityQuery { Date = DaysFromNow(2), Time = "20:00" }, CancellationToken.None);
        var free = await handler.Handle(new GetReservationAvailabilityQuery { Date = DaysFromNow(2), Time = "12:00" }, CancellationToken.None);

        Assert.Contains(table.Id, busy.Value!.UnavailableTableIds);
        Assert.Empty(free.Value!.UnavailableTableIds);
    }

    [Fact]
    public async Task DecideReservation_ConfirmThenCancel_UpdatesStatusAndKeepsTableStatus()
    {
        var (table, _) = await SeedRestaurantAsync();
        var created = await new CreateReservationRequestCommandHandler(Db, _tenant, _tableNotifications)
            .Handle(ReservationCommand(table, "19:00"), CancellationToken.None);
        var handler = new DecideReservationCommandHandler(Db, CurrentUser, _tableNotifications);

        var confirm = await handler.Handle(new DecideReservationCommand { Id = created.Value!.Id, Decision = ReservationDecision.Confirm }, CancellationToken.None);
        Assert.True(confirm.IsSuccess, confirm.Error);
        Assert.Equal(ReservationStatus.Confirmed, DbContext.Reservations.Single().Status);
        Assert.Equal(TableStatus.Available, table.Status);

        var list = await new GetCustomerReservationsQueryHandler(Db, CurrentUser).Handle(new GetCustomerReservationsQuery(), CancellationToken.None);
        Assert.Single(list.Value!);

        var cancel = await handler.Handle(new DecideReservationCommand { Id = created.Value.Id, Decision = ReservationDecision.Cancel }, CancellationToken.None);
        Assert.True(cancel.IsSuccess, cancel.Error);
        Assert.Equal(ReservationStatus.Cancelled, DbContext.Reservations.Single().Status);
    }

    [Fact]
    public async Task DecideReservation_FromAnotherBranch_IsNotFound()
    {
        var (table, _) = await SeedRestaurantAsync();
        var created = await new CreateReservationRequestCommandHandler(Db, _tenant, _tableNotifications)
            .Handle(ReservationCommand(table, "19:00"), CancellationToken.None);

        var stranger = new FakeCurrentUserService { Role = "Admin" };
        var handler = new DecideReservationCommandHandler(Db, stranger, _tableNotifications);
        var result = await handler.Handle(new DecideReservationCommand { Id = created.Value!.Id, Decision = ReservationDecision.Confirm }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ReservationStatus.Pending, DbContext.Reservations.Single().Status);
    }
}
