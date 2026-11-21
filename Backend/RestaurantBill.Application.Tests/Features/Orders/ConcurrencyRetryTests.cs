using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Orders.Commands.AddLinesToOrder;
using RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Application.Tests.Features.Orders;

// Aynı saniyede aynı siparişe ekleme: çakışan istek sipariş taze okunarak yeniden uygulanır, iki ekleme de kaydedilir
// ve hiçbiri iki kez yazılmaz.
public class ConcurrencyRetryTests : IDisposable
{
    private readonly DbContextOptions<RestaurantBillDbContext> _options = new DbContextOptionsBuilder<RestaurantBillDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .Options;
    private readonly FakeCurrentUserService _user = new();
    private readonly ConflictOnceDbContext _db;

    private Guid _orderId;
    private Guid _cayId;
    private Guid _suId;

    public ConcurrencyRetryTests()
    {
        _db = new ConflictOnceDbContext(_options, _user);
    }

    public void Dispose() => _db.Dispose();

    // İlk SaveChanges'ten hemen önce başka bir istek (ayrı DbContext = ayrı HTTP isteği) aynı siparişe ekleme yapıp
    // kaydeder; ardından Postgres'teki xmin çakışması gibi DbUpdateConcurrencyException fırlatılır.
    private sealed class ConflictOnceDbContext(DbContextOptions<RestaurantBillDbContext> options, ICurrentUserService user)
        : RestaurantBillDbContext(options, user)
    {
        public Func<Task>? ConcurrentWrite { get; set; }
        public int ConflictsLeft { get; set; }
        public int SaveCalls { get; private set; }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveCalls++;
            if (ConflictsLeft > 0)
            {
                ConflictsLeft--;
                if (ConcurrentWrite is not null)
                {
                    await ConcurrentWrite();
                    ConcurrentWrite = null;
                }
                throw new DbUpdateConcurrencyException("Simüle edilen xmin çakışması.");
            }
            return await base.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task SeedAsync()
    {
        await using var seed = new RestaurantBillDbContext(_options, _user);
        Region region = Region.Create("Salon", _user.BranchId);
        Category category = Category.Create("İçecek", _user.BranchId);
        seed.AddRange(region, category);
        await seed.SaveChangesAsync();

        Product cay = Product.Create("Çay", 15m, "", category.Id);
        Product su = Product.Create("Su", 10m, "", category.Id);
        Table table = Table.Create("Masa 1", "", region.Id);
        seed.AddRange(cay, su, table);
        await seed.SaveChangesAsync();

        Order order = Order.Create(table.Id, _user.BranchId);
        seed.Orders.Add(order);
        await seed.SaveChangesAsync();

        _orderId = order.Id;
        _cayId = cay.Id;
        _suId = su.Id;
    }

    // Diğer garson: aynı siparişe 1 Su ekler (kendi DbContext'iyle, add-product üzerinden).
    private async Task OtherWaiterAddsWaterAsync()
    {
        await using var other = new RestaurantBillDbContext(_options, _user);
        Result result = await new AddProductToOrderCommandHandler(other, new FakeTableNotificationService(), new FakeCashierNotificationService(), _user)
            .Handle(new AddProductToOrderCommand { OrderId = _orderId, OrderItems = [new CreateOrderItemDto { ProductId = _suId, Quantity = 1 }] }, CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);
    }

    private async Task<List<OrderItem>> StoredItemsAsync()
    {
        await using var read = new RestaurantBillDbContext(_options, _user);
        return await read.OrderItems.Where(i => i.OrderId == _orderId).ToListAsync();
    }

    private async Task<decimal> StoredTotalAsync()
    {
        await using var read = new RestaurantBillDbContext(_options, _user);
        return (await read.Orders.SingleAsync(o => o.Id == _orderId)).TotalPrice;
    }

    [Fact]
    public async Task AddLines_ConflictWithConcurrentAdd_RetriesAndKeepsBothWithoutDuplicates()
    {
        await SeedAsync();
        _db.ConflictsLeft = 1;
        _db.ConcurrentWrite = OtherWaiterAddsWaterAsync;
        var cashier = new FakeCashierNotificationService();

        Result result = await new AddLinesToOrderCommandHandler(_db, new FakeTableNotificationService(), cashier, _user)
            .Handle(new AddLinesToOrderCommand { OrderId = _orderId, Products = [new CreateOrderItemDto { ProductId = _cayId, Quantity = 2 }] }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(2, _db.SaveCalls); // çakışan deneme + başarılı yeniden deneme
        List<OrderItem> items = await StoredItemsAsync();
        Assert.Equal(2, Assert.Single(items, i => i.ProductId == _cayId).Quantity); // 4 değil: yeniden deneme istekten kurulur
        Assert.Equal(1, Assert.Single(items, i => i.ProductId == _suId).Quantity);  // diğer garsonun eklemesi ezilmedi
        Assert.Equal(2 * 15m + 10m, await StoredTotalAsync());
        Assert.Equal(1, cashier.OrdersChangedCount); // bildirim yalnızca başarılı kayıttan sonra, bir kez
    }

    [Fact]
    public async Task AddProduct_ConflictWithConcurrentAdd_RetriesAndSucceeds()
    {
        await SeedAsync();
        _db.ConflictsLeft = 1;
        _db.ConcurrentWrite = OtherWaiterAddsWaterAsync;

        Result result = await new AddProductToOrderCommandHandler(_db, new FakeTableNotificationService(), new FakeCashierNotificationService(), _user)
            .Handle(new AddProductToOrderCommand { OrderId = _orderId, OrderItems = [new CreateOrderItemDto { ProductId = _cayId, Quantity = 3 }] }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        List<OrderItem> items = await StoredItemsAsync();
        Assert.Equal(3, Assert.Single(items, i => i.ProductId == _cayId).Quantity);
        Assert.Equal(1, Assert.Single(items, i => i.ProductId == _suId).Quantity);
        Assert.Equal(3 * 15m + 10m, await StoredTotalAsync());
    }

    [Fact]
    public async Task AddLines_ConflictEveryTime_GivesUpAfterBoundedRetries_NothingSaved()
    {
        await SeedAsync();
        _db.ConflictsLeft = int.MaxValue;
        var cashier = new FakeCashierNotificationService();

        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() =>
            new AddLinesToOrderCommandHandler(_db, new FakeTableNotificationService(), cashier, _user)
                .Handle(new AddLinesToOrderCommand { OrderId = _orderId, Products = [new CreateOrderItemDto { ProductId = _cayId, Quantity = 1 }] }, CancellationToken.None));

        Assert.Equal(1 + ConcurrencyRetry.DefaultMaxRetries, _db.SaveCalls);
        Assert.Empty(await StoredItemsAsync());
        Assert.Equal(0, cashier.OrdersChangedCount);
    }

    [Fact]
    public async Task ExecuteAsync_ClearsTrackedEntitiesBeforeEachRetry()
    {
        await SeedAsync();
        int attempts = 0;
        List<int> trackedAtStart = [];

        int value = await ConcurrencyRetry.ExecuteAsync(_db, async ct =>
        {
            trackedAtStart.Add(_db.ChangeTracker.Entries().Count());
            attempts++;
            await _db.Orders.FirstAsync(o => o.Id == _orderId, ct); // her deneme kaydı kendisi yükler
            if (attempts < 3)
                throw new DbUpdateConcurrencyException("çakışma");
            return 42;
        }, CancellationToken.None);

        Assert.Equal(42, value);
        Assert.Equal(3, attempts);
        Assert.All(trackedAtStart, count => Assert.Equal(0, count));
    }
}
