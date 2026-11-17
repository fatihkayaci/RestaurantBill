using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.CustomerSite.Public;
using RestaurantBill.Application.Features.CustomerSite.Staff;
using RestaurantBill.Application.Features.SetMenus;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.CustomerSite;

// Masadaki QR'dan menü (set) siparişi. "Adana Menü" = Adana (100, sabit) + İçecek (Ayran 30 varsayılan / Kola 40 → +10 ₺)
// + Patates (20, sabit) = 150 ₺. "Seçmeli Menü"nün içecek bölümünde varsayılan yok: seçim zorunlu.
public class QrSetMenuOrderRequestTests : ApplicationTestBase
{
    private const string Slug = "test-restoran";

    private readonly FakeTenantResolver _tenant = new() { Slug = Slug };
    private readonly FakeTableNotificationService _tableNotifications = new();
    private readonly FakeCashierNotificationService _cashierNotifications = new();

    private Table _table = default!;
    private Product _adana = default!;
    private Product _ayran = default!;
    private Product _kola = default!;
    private Product _patates = default!;
    private Product _corba = default!;
    private SetMenu _adanaMenu = default!;
    private SetMenu _choiceMenu = default!;

    private async Task SeedAsync()
    {
        User owner = await SeedActorAsync();
        Company company = Company.Create("Test Restoran", owner);
        company.Slug = Slug;
        DbContext.Companies.Add(company);
        await DbContext.SaveChangesAsync();

        Branch branch = Branch.Create(company.Id, "Merkez", "", "", "", "İstanbul", "Fatih", "", 10m);
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(branch, CurrentUser.BranchId);
        DbContext.Branches.Add(branch);
        await DbContext.SaveChangesAsync();

        _table = await SeedTableAsync();
        Category izgara = Category.Create("Izgara", branch.Id);
        Category icecek = Category.Create("İçecek", branch.Id);
        DbContext.Categories.AddRange(izgara, icecek);
        await DbContext.SaveChangesAsync();

        _adana = await ProductAsync("Adana Kebap", izgara, 100m);
        _patates = await ProductAsync("Patates", izgara, 20m);
        _corba = await ProductAsync("Mercimek Çorbası", izgara, 120m);
        _ayran = await ProductAsync("Ayran", icecek, 30m);
        _kola = await ProductAsync("Kola", icecek, 40m);

        _adanaMenu = await MenuAsync("Adana Menü", drinkDefault: true);
        _choiceMenu = await MenuAsync("Seçmeli Menü", drinkDefault: false);
    }

    private async Task<Product> ProductAsync(string name, Category category, decimal price)
    {
        Product product = Product.Create(name, price, "", category.Id);
        DbContext.Products.Add(product);
        await DbContext.SaveChangesAsync();
        return product;
    }

    private async Task<SetMenu> MenuAsync(string name, bool drinkDefault)
    {
        var created = await new CreateSetMenuCommandHandler(Db, CurrentUser).Handle(new CreateSetMenuCommand
        {
            Name = name,
            Slots =
            [
                new SetMenuSlotInput { Name = "Ana yemek", Options = [new SetMenuOptionInput { ProductId = _adana.Id }] },
                new SetMenuSlotInput
                {
                    Name = "İçecek",
                    Options =
                    [
                        new SetMenuOptionInput { ProductId = _ayran.Id, IsDefault = drinkDefault },
                        new SetMenuOptionInput { ProductId = _kola.Id },
                    ]
                },
                new SetMenuSlotInput { Name = "Yan ürün", Options = [new SetMenuOptionInput { ProductId = _patates.Id }] },
            ]
        }, CancellationToken.None);
        Assert.True(created.IsSuccess, created.Error);
        return await DbContext.SetMenus.Include(s => s.Slots).SingleAsync(s => s.Id == created.Value);
    }

    private static Guid DrinkSlot(SetMenu menu) => menu.Slots.Single(s => s.Name == "İçecek").Id;

    private static OrderRequestItemInput MenuLine(SetMenu menu, Guid? drink, int quantity = 1, string? note = null) => new()
    {
        Kind = CartLineInput.SetMenuKind,
        SetMenuId = menu.Id,
        Quantity = quantity,
        Note = note,
        Selections = drink is Guid productId ? [new CartSelectionInput { SlotId = DrinkSlot(menu), ProductId = productId }] : []
    };

    private Task<Result<RestaurantBill.Application.DTOs.CustomerSite.OrderRequestStatusDto>> SendAsync(params OrderRequestItemInput[] items)
        => new CreateOrderRequestCommandHandler(Db, _tenant, new OrderPricingService(Db), _tableNotifications)
            .Handle(new CreateOrderRequestCommand { TableId = _table.Id, Items = [.. items] }, CancellationToken.None);

    private Task<Result> ApproveAsync(Guid id)
        => new ApproveOrderRequestCommandHandler(Db, CurrentUser, _tableNotifications, _cashierNotifications)
            .Handle(new ApproveOrderRequestCommand { Id = id }, CancellationToken.None);

    [Fact]
    public async Task CreateOrderRequest_WithSetMenu_StoresResolvedSelections()
    {
        await SeedAsync();

        var result = await SendAsync(MenuLine(_adanaMenu, _kola.Id, quantity: 2, note: "acısız"));

        Assert.True(result.IsSuccess, result.Error);
        OrderRequestItem item = await DbContext.OrderRequestItems.SingleAsync();
        Assert.True(item.IsSetMenu);
        Assert.Null(item.ProductId);
        Assert.Equal(_adanaMenu.Id, item.SetMenuId);
        Assert.Equal(2, item.Quantity);
        Assert.Equal("acısız", item.Note);
        Assert.Null(item.UnitPrice); // ürünler gibi: onayda güncel fiyat
        // Varsayılanlar dahil tüm bölümler saklanır.
        Dictionary<Guid, Guid> selections = RestaurantBill.Application.Features.Delivery.DeliveryScope.ParseSelections(item.SelectionsJson);
        Assert.Equal(3, selections.Count);
        Assert.Equal(_kola.Id, selections[DrinkSlot(_adanaMenu)]);
        Assert.Empty(DbContext.Orders.ToList());
    }

    [Fact]
    public async Task CreateOrderRequest_WithSetMenuMissingRequiredSlot_Fails()
    {
        await SeedAsync();

        var result = await SendAsync(MenuLine(_choiceMenu, drink: null));

        Assert.False(result.IsSuccess);
        Assert.Contains("İçecek", result.Error);
        Assert.Empty(DbContext.OrderRequests.ToList());
    }

    [Fact]
    public async Task CreateOrderRequest_WithSoldOutOption_Fails()
    {
        await SeedAsync();
        _kola.SetOutOfStock(true);
        await DbContext.SaveChangesAsync();

        var result = await SendAsync(MenuLine(_adanaMenu, _kola.Id));

        Assert.False(result.IsSuccess);
        Assert.Contains("Kola", result.Error);
        Assert.Empty(DbContext.OrderRequests.ToList());
    }

    [Fact]
    public async Task CreateOrderRequest_WithSetMenuFromAnotherBranch_Fails()
    {
        await SeedAsync();
        Branch other = Branch.Create(Guid.NewGuid(), "Şube 2", "", "", "", "İstanbul", "Fatih", "", 10m);
        DbContext.Branches.Add(other);
        await DbContext.SaveChangesAsync();
        typeof(SetMenu).GetProperty(nameof(SetMenu.BranchId))!.SetValue(_adanaMenu, other.Id);
        await DbContext.SaveChangesAsync();

        var result = await SendAsync(MenuLine(_adanaMenu, _kola.Id));

        Assert.False(result.IsSuccess);
        Assert.Empty(DbContext.OrderRequests.ToList());
    }

    [Fact]
    public async Task PendingRequests_ShowSetMenuNameChoicesAndPrice()
    {
        await SeedAsync();
        var sent = await SendAsync(
            new OrderRequestItemInput { ProductId = _corba.Id, Quantity = 1 },
            MenuLine(_adanaMenu, _kola.Id, quantity: 2));
        Assert.True(sent.IsSuccess, sent.Error);

        var pending = await new GetPendingOrderRequestsQueryHandler(Db, CurrentUser).Handle(new GetPendingOrderRequestsQuery(), CancellationToken.None);

        Assert.True(pending.IsSuccess, pending.Error);
        var request = Assert.Single(pending.Value!);
        Assert.Equal(2, request.Items.Count);
        var product = request.Items.Single(i => i.ProductId == _corba.Id);
        Assert.Equal(CartLineInput.ProductKind, product.Kind);
        Assert.Equal("Mercimek Çorbası", product.ProductName);
        Assert.Empty(product.Selections);
        var menu = request.Items.Single(i => i.SetMenuId is not null);
        Assert.Equal(CartLineInput.SetMenuKind, menu.Kind);
        Assert.Equal(_adanaMenu.Id, menu.SetMenuId);
        Assert.Equal("Adana Menü", menu.ProductName);
        Assert.Equal(["Kola (+₺10)"], menu.Selections);
        Assert.Equal(160m, menu.UnitPrice);
        Assert.Equal(120m + 2 * 160m, request.Total);
    }

    [Fact]
    public async Task ApproveOrderRequest_WithSetMenu_AddsSetLineAndComponentsLikeTheWaiter()
    {
        await SeedAsync();
        var sent = await SendAsync(
            new OrderRequestItemInput { ProductId = _corba.Id, Quantity = 1, Note = "az tuzlu" },
            MenuLine(_adanaMenu, _kola.Id, quantity: 2, note: "acısız"));
        Assert.True(sent.IsSuccess, sent.Error);

        var result = await ApproveAsync(sent.Value!.Id);

        Assert.True(result.IsSuccess, result.Error);
        Order order = await DbContext.Orders.Include(o => o.OrderItems).SingleAsync();
        OrderItem menuLine = order.OrderItems.Single(i => i.SetMenuId == _adanaMenu.Id);
        Assert.Equal(160m, menuLine.UnitPrice);
        Assert.Equal(2, menuLine.Quantity);
        Assert.Equal("acısız", menuLine.Note);
        Assert.Equal(10m, menuLine.TaxRate); // menünün kategorisi yok → şube oranı

        List<OrderItem> components = order.OrderItems.Where(i => i.ParentOrderItemId == menuLine.Id).ToList();
        Assert.Equal(3, components.Count);
        Assert.Contains(components, c => c.ProductId == _kola.Id);
        Assert.Contains(components, c => c.ProductId == _adana.Id);
        Assert.Contains(components, c => c.ProductId == _patates.Id);
        Assert.All(components, c => Assert.Equal(0m, c.UnitPrice));

        OrderItem soup = order.OrderItems.Single(i => i.ProductId == _corba.Id && i.ParentOrderItemId == null);
        Assert.Equal(120m, soup.UnitPrice);
        Assert.Equal(120m + 2 * 160m, order.TotalPrice);
        Assert.Equal(OrderRequestStatus.Approved, DbContext.OrderRequests.Single().Status);
        Assert.Equal(TableStatus.Occupied, _table.Status);
    }

    [Fact]
    public async Task ApproveOrderRequest_WhenSetMenuWasDeactivated_FailsAndStaysPending()
    {
        await SeedAsync();
        var sent = await SendAsync(MenuLine(_adanaMenu, _kola.Id));
        Assert.True(sent.IsSuccess, sent.Error);
        typeof(SetMenu).GetProperty(nameof(SetMenu.IsActive))!.SetValue(_adanaMenu, false);
        await DbContext.SaveChangesAsync();

        var result = await ApproveAsync(sent.Value!.Id);

        Assert.False(result.IsSuccess);
        Assert.Empty(DbContext.Orders.ToList());
        Assert.Equal(OrderRequestStatus.Pending, DbContext.OrderRequests.Single().Status);
    }

    [Fact]
    public async Task ProductOnlyRequest_IsUnchanged()
    {
        await SeedAsync();
        var sent = await SendAsync(new OrderRequestItemInput { ProductId = _corba.Id, Quantity = 2 });
        Assert.True(sent.IsSuccess, sent.Error);

        OrderRequestItem item = await DbContext.OrderRequestItems.SingleAsync();
        Assert.False(item.IsSetMenu);
        Assert.Equal(_corba.Id, item.ProductId);
        Assert.Equal("{}", item.SelectionsJson);

        var result = await ApproveAsync(sent.Value!.Id);

        Assert.True(result.IsSuccess, result.Error);
        Order order = await DbContext.Orders.Include(o => o.OrderItems).SingleAsync();
        OrderItem line = Assert.Single(order.OrderItems);
        Assert.Equal(_corba.Id, line.ProductId);
        Assert.Equal(240m, order.TotalPrice);
    }
}
