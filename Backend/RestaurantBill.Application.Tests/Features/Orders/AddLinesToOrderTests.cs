using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Orders.Commands;
using RestaurantBill.Application.Features.Orders.Commands.AddLinesToOrder;
using RestaurantBill.Application.Features.Orders.Commands.AddSetMenuToOrder;
using RestaurantBill.Application.Features.SetMenus;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.Orders;

// "Mutfağa gönder" tek istek: ürünler + menüler birlikte, ya hepsi ya hiçbiri.
// "Adana Menü" = Adana (100) + İçecek (Ayran 30 varsayılan / Kola 40 → +10 ₺) = 130 ₺; Çay 15 ₺.
public class AddLinesToOrderTests : ApplicationTestBase
{
    private Branch _branch = default!;
    private Category _izgara = default!;
    private Product _adana = default!;
    private Product _ayran = default!;
    private Product _kola = default!;
    private Product _cay = default!;

    private async Task<(Order Order, Table Table, SetMenu Menu)> SeedAsync()
    {
        await SeedActorAsync();
        _branch = Branch.Create(Guid.NewGuid(), "Merkez", "Y", "111", "a@mail.com", "İstanbul", "Kadıköy", "Adres", 10m);
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(_branch, CurrentUser.BranchId);
        DbContext.Branches.Add(_branch);
        _izgara = Category.Create("Izgara", _branch.Id);
        DbContext.Categories.Add(_izgara);
        await DbContext.SaveChangesAsync();

        _adana = await SeedProductAsync("Adana Kebap", 100m);
        _ayran = await SeedProductAsync("Ayran", 30m);
        _kola = await SeedProductAsync("Kola", 40m);
        _cay = await SeedProductAsync("Çay", 15m);

        var created = await new CreateSetMenuCommandHandler(Db, CurrentUser).Handle(new CreateSetMenuCommand
        {
            Name = "Adana Menü",
            Slots =
            [
                new SetMenuSlotInput { Name = "Ana yemek", Options = [new SetMenuOptionInput { ProductId = _adana.Id }] },
                new SetMenuSlotInput
                {
                    Name = "İçecek",
                    Options =
                    [
                        new SetMenuOptionInput { ProductId = _ayran.Id, IsDefault = true },
                        new SetMenuOptionInput { ProductId = _kola.Id },
                    ]
                },
            ]
        }, CancellationToken.None);
        Assert.True(created.IsSuccess, created.Error);

        Table table = await SeedTableAsync();
        Order order = Order.Create(table.Id, CurrentUser.BranchId);
        DbContext.Orders.Add(order);
        await DbContext.SaveChangesAsync();

        SetMenu menu = await DbContext.SetMenus.Include(s => s.Slots).SingleAsync(s => s.Id == created.Value);
        return (order, table, menu);
    }

    private async Task<Product> SeedProductAsync(string name, decimal price)
    {
        Product product = Product.Create(name, price, "", _izgara.Id);
        DbContext.Products.Add(product);
        await DbContext.SaveChangesAsync();
        return product;
    }

    private AddLinesToOrderCommandHandler Handler(FakeCashierNotificationService cashier, FakeCurrentUserService? user = null) =>
        new(Db, new FakeTableNotificationService(), cashier, user ?? CurrentUser);

    private static Guid DrinkSlotId(SetMenu menu) => menu.Slots.Single(s => s.Name == "İçecek").Id;

    private AddLinesToOrderCommand Command(Order order, SetMenu menu) => new()
    {
        OrderId = order.Id,
        Note = "Çocuk sandalyesi",
        Products = [new CreateOrderItemDto { ProductId = _cay.Id, Quantity = 2, Note = "Açık" }],
        SetMenus =
        [
            new SetMenuLineDto
            {
                SetMenuId = menu.Id,
                Quantity = 1,
                Note = "Acısız",
                Selections = [new SetMenuSelectionInput { SlotId = DrinkSlotId(menu), ProductId = _kola.Id }],
            },
            new SetMenuLineDto { SetMenuId = menu.Id, Quantity = 2 },
        ],
    };

    private async Task<List<OrderItem>> SavedItemsAsync(Guid orderId)
    {
        DbContext.ChangeTracker.Clear();
        return await DbContext.OrderItems.Where(i => i.OrderId == orderId).ToListAsync();
    }

    [Fact]
    public async Task ProductsAndSetMenus_AreSavedTogether_AndNotifiedOnce()
    {
        var (order, _, menu) = await SeedAsync();
        var cashier = new FakeCashierNotificationService();

        Result result = await Handler(cashier).Handle(Command(order, menu), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        List<OrderItem> items = await SavedItemsAsync(order.Id);
        OrderItem cay = Assert.Single(items, i => i.ProductId == _cay.Id && i.ParentOrderItemId == null);
        Assert.Equal(2, cay.Quantity);
        Assert.Equal("Açık", cay.Note);
        List<OrderItem> setLines = items.Where(i => i.SetMenuId == menu.Id).ToList();
        Assert.Equal(2, setLines.Count);
        Assert.Contains(setLines, l => l.UnitPrice == 140m && l.Quantity == 1 && l.Note == "Acısız"); // Kola +10
        Assert.Contains(setLines, l => l.UnitPrice == 130m && l.Quantity == 2); // varsayılan Ayran
        Assert.Equal(4, items.Count(i => i.ParentOrderItemId != null)); // her menünün 2 bileşeni

        Order saved = await DbContext.Orders.SingleAsync(o => o.Id == order.Id);
        Assert.Equal(2 * 15m + 140m + 2 * 130m, saved.TotalPrice);
        Assert.Equal("Çocuk sandalyesi", saved.Note);
        Assert.Equal(1, cashier.OrdersChangedCount);
    }

    [Fact]
    public async Task InactiveSetMenu_FailsWholeRequest_NothingSaved()
    {
        var (order, _, menu) = await SeedAsync();
        typeof(SetMenu).GetProperty(nameof(SetMenu.IsActive))!.SetValue(menu, false); // satıştan kaldırıldı
        await DbContext.SaveChangesAsync();
        var cashier = new FakeCashierNotificationService();

        Result result = await Handler(cashier).Handle(Command(order, menu), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Contains("1. menü satırı", result.Error);
        Assert.Contains("Adana Menü", result.Error);
        Assert.Contains("Sipariş gönderilmedi", result.Error);
        Assert.Empty(await SavedItemsAsync(order.Id));
        Assert.Equal(0m, (await DbContext.Orders.SingleAsync(o => o.Id == order.Id)).TotalPrice);
        Assert.Equal(0, cashier.OrdersChangedCount);
    }

    [Fact]
    public async Task UnknownProduct_FailsWholeRequest_NamingTheLine()
    {
        var (order, _, menu) = await SeedAsync();
        AddLinesToOrderCommand command = Command(order, menu);
        command.Products.Add(new CreateOrderItemDto { ProductId = Guid.NewGuid(), Quantity = 1 });

        Result result = await Handler(new FakeCashierNotificationService()).Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.StartsWith("Sepetteki 2. ürün satırı eklenemedi", result.Error);
        Assert.Empty(await SavedItemsAsync(order.Id));
    }

    [Fact]
    public async Task SetMenuOfAnotherBranch_IsNotFound_NothingSaved()
    {
        var (order, _, menu) = await SeedAsync();
        // Menü başka bir şubenin: siparişin şubesinde olmayan menü eklenmez.
        typeof(SetMenu).GetProperty(nameof(SetMenu.BranchId))!.SetValue(menu, Guid.NewGuid());
        await DbContext.SaveChangesAsync();

        Result result = await Handler(new FakeCashierNotificationService()).Handle(Command(order, menu), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Contains(OrderLineAdding.SetMenuNotFoundMessage, result.Error);
        Assert.Empty(await SavedItemsAsync(order.Id));
    }

    [Fact]
    public async Task OrderOfAnotherBranch_IsNotFound()
    {
        var (_, _, menu) = await SeedAsync();
        Order foreign = Order.Create(Guid.NewGuid(), Guid.NewGuid());
        DbContext.Orders.Add(foreign);
        await DbContext.SaveChangesAsync();

        Result result = await Handler(new FakeCashierNotificationService()).Handle(Command(foreign, menu), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(OrderLineAdding.OrderNotFoundMessage, result.Error);
        Assert.Empty(await SavedItemsAsync(foreign.Id));
    }

    [Fact]
    public async Task WaiterWithoutTakeOrders_IsDenied_NothingSaved()
    {
        var (order, _, menu) = await SeedAsync();
        FakeCurrentUserService waiter = await SeedWaiterAsync(m => m.SetWaiterPermissions(false, false, false, false, false));

        Result result = await Handler(new FakeCashierNotificationService(), waiter).Handle(Command(order, menu), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(StaffAccess.DeniedMessage(WaiterPermission.TakeOrders), result.Error);
        Assert.Empty(await SavedItemsAsync(order.Id));
    }

    [Fact]
    public async Task WaiterOutsideRegion_IsDenied()
    {
        var (order, _, menu) = await SeedAsync();
        Region otherRegion = await SeedRegionAsync();
        FakeCurrentUserService waiter = await SeedWaiterAsync(m => m.SetRegions([otherRegion.Id]));

        Result result = await Handler(new FakeCashierNotificationService(), waiter).Handle(Command(order, menu), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(StaffAccess.RegionDeniedMessage, result.Error);
        Assert.Empty(await SavedItemsAsync(order.Id));
    }

    [Fact]
    public async Task WaiterWithTakeOrders_CanSend()
    {
        var (order, _, menu) = await SeedAsync();
        FakeCurrentUserService waiter = await SeedWaiterAsync();

        Result result = await Handler(new FakeCashierNotificationService(), waiter).Handle(Command(order, menu), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.NotEmpty(await SavedItemsAsync(order.Id));
    }

    [Fact]
    public void Validator_RejectsEmptyRequest_AndBadLines()
    {
        var validator = new AddLinesToOrderCommandValidator();

        Assert.False(validator.Validate(new AddLinesToOrderCommand { OrderId = Guid.NewGuid() }).IsValid);
        Assert.False(validator.Validate(new AddLinesToOrderCommand
        {
            OrderId = Guid.NewGuid(),
            SetMenus = [new SetMenuLineDto { SetMenuId = Guid.NewGuid(), Quantity = 0 }],
        }).IsValid);
        Assert.True(validator.Validate(new AddLinesToOrderCommand
        {
            OrderId = Guid.NewGuid(),
            SetMenus = [new SetMenuLineDto { SetMenuId = Guid.NewGuid(), Quantity = 1 }],
        }).IsValid);
    }

    private async Task<FakeCurrentUserService> SeedWaiterAsync(Action<UserBranch>? configure = null)
    {
        User user = User.Create("Garson", "", "");
        DbContext.Users.Add(user);
        UserBranch membership = UserBranch.Create(user, _branch, $"g{Guid.NewGuid():N}"[..10], null, UserRole.Waiter);
        configure?.Invoke(membership);
        DbContext.UserBranches.Add(membership);
        await DbContext.SaveChangesAsync();
        return new FakeCurrentUserService { BranchId = CurrentUser.BranchId, CompanyId = CurrentUser.CompanyId, UserId = user.Id, Role = "Waiter" };
    }
}
