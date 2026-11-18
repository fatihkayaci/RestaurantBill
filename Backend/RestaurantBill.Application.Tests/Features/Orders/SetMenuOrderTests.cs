using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Orders.Commands.AddSetMenuToOrder;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemsStatus;
using RestaurantBill.Application.Features.Orders.Queries;
using RestaurantBill.Application.Features.Orders.Queries.GetActiveOrderByTableId;
using RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToKitchen;
using RestaurantBill.Application.Features.Products.Commands.UpdateProduct;
using RestaurantBill.Application.Features.SetMenus;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Orders;

// "Adana Menü" = Adana Kebap (100, Izgara, sabit) + İçecek (Ayran 30 varsayılan / Kola 40 → +10 ₺) + Patates (20, Izgara, sabit) = 150 ₺.
public class SetMenuOrderTests : ApplicationTestBase
{
    private Category _izgara = default!;
    private Category _icecek = default!;
    private Product _adana = default!;
    private Product _ayran = default!;
    private Product _kola = default!;
    private Product _patates = default!;
    private Branch _branch = default!;

    private async Task<(Order Order, Table Table, SetMenu Menu)> SeedAsync()
    {
        await SeedActorAsync();
        _branch = Branch.Create(Guid.NewGuid(), "Merkez", "Y", "111", "a@mail.com", "İstanbul", "Kadıköy", "Adres", 10m);
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(_branch, CurrentUser.BranchId);
        DbContext.Branches.Add(_branch);

        _izgara = Category.Create("Izgara", _branch.Id);
        _icecek = Category.Create("İçecek", _branch.Id);
        DbContext.Categories.AddRange(_izgara, _icecek);
        await DbContext.SaveChangesAsync();

        _adana = await SeedProductAsync("Adana Kebap", _izgara, 100m, cost: 60m);
        _patates = await SeedProductAsync("Patates", _izgara, 20m, cost: 8m);
        _ayran = await SeedProductAsync("Ayran", _icecek, 30m, cost: 5m);
        _kola = await SeedProductAsync("Kola", _icecek, 40m, cost: 12m);

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
                new SetMenuSlotInput { Name = "Yan ürün", Options = [new SetMenuOptionInput { ProductId = _patates.Id }] },
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

    private async Task<Product> SeedProductAsync(string name, Category category, decimal price, decimal cost)
    {
        Product product = Product.Create(name, price, "", category.Id);
        product.SetCost(cost);
        DbContext.Products.Add(product);
        await DbContext.SaveChangesAsync();
        return product;
    }

    private AddSetMenuToOrderCommandHandler AddHandler(FakeTableNotificationService? notifications = null) =>
        new(Db, notifications ?? new FakeTableNotificationService(), new FakeCashierNotificationService(), CurrentUser);

    private static Guid DrinkSlotId(SetMenu menu) => menu.Slots.Single(s => s.Name == "İçecek").Id;

    private Task<RestaurantBill.Domain.Shared.Result<Guid>> AddKolaMenuAsync(Order order, SetMenu menu, int quantity = 1) =>
        AddHandler().Handle(new AddSetMenuToOrderCommand
        {
            OrderId = order.Id,
            SetMenuId = menu.Id,
            Quantity = quantity,
            Note = "Acısız",
            Selections = [new SetMenuSelectionInput { SlotId = DrinkSlotId(menu), ProductId = _kola.Id }]
        }, CancellationToken.None);

    [Fact]
    public async Task AddSetMenu_CreatesSetLineAndComponents_WithServerSidePrice()
    {
        var (order, _, menu) = await SeedAsync();

        var result = await AddKolaMenuAsync(order, menu, quantity: 2);

        Assert.True(result.IsSuccess, result.Error);
        OrderItem line = await DbContext.OrderItems.SingleAsync(i => i.Id == result.Value);
        Assert.Equal(menu.Id, line.SetMenuId);
        Assert.Equal(160m, line.UnitPrice);
        Assert.Equal(2, line.Quantity);
        Assert.Equal(10m, line.TaxRate); // menünün kategorisi yok → şube oranı

        List<OrderItem> components = await DbContext.OrderItems.Where(i => i.ParentOrderItemId == line.Id).ToListAsync();
        Assert.Equal(3, components.Count);
        Assert.Contains(components, c => c.ProductId == _kola.Id);
        Assert.All(components, c => Assert.Equal(0m, c.UnitPrice));
        Assert.Equal(320m, (await DbContext.Orders.SingleAsync()).TotalPrice);
    }

    [Fact]
    public async Task AddSetMenu_WithInvalidSelection_IsRejected_AndOrderUnchanged()
    {
        var (order, _, menu) = await SeedAsync();

        var result = await AddHandler().Handle(new AddSetMenuToOrderCommand
        {
            OrderId = order.Id,
            SetMenuId = menu.Id,
            Quantity = 1,
            Selections = [new SetMenuSelectionInput { SlotId = DrinkSlotId(menu), ProductId = _adana.Id }]
        }, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Empty(DbContext.OrderItems);
    }

    [Fact]
    public async Task AddSetMenu_FromAnotherBranch_IsNotFound()
    {
        var (order, _, _) = await SeedAsync();
        SetMenu foreign = SetMenu.Create(Guid.NewGuid(), "Yabancı Menü");
        foreign.SetContents([new SetMenuSlotDraft("Ana", [new SetMenuOptionDraft(_adana, false)])], DiscountType.None, 0m);
        DbContext.SetMenus.Add(foreign);
        await DbContext.SaveChangesAsync();

        var result = await AddHandler().Handle(new AddSetMenuToOrderCommand { OrderId = order.Id, SetMenuId = foreign.Id, Quantity = 1 }, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Empty(DbContext.OrderItems);
    }

    [Fact]
    public async Task KitchenSeesComponentsUnderSetName_BillSeesOneSetLine()
    {
        var (order, table, menu) = await SeedAsync();
        await AddKolaMenuAsync(order, menu);
        DbContext.ChangeTracker.Clear();

        var kitchen = await new GetAllOrdersToKitchenQueryHandler(Db, CurrentUser).Handle(new GetAllOrdersToKitchenQuery(), CancellationToken.None);
        List<OrderItemDto> kitchenItems = Assert.Single(kitchen.Value!).OrderItems.ToList();
        Assert.Equal(["Adana Kebap", "Kola", "Patates"], kitchenItems.Select(i => i.ProductName).Order());
        Assert.All(kitchenItems, i => Assert.Equal("Adana Menü", i.SetMenuName));
        Assert.All(kitchenItems, i => Assert.Equal("Acısız", i.SetMenuNote));
        Assert.All(kitchenItems, i => Assert.NotNull(i.ParentOrderItemId));

        var bill = await new GetActiveOrderByTableIdHandler(new OrderQueries(Db), Db, CurrentUser)
            .Handle(new GetActiveOrderByTableIdQuery { TableId = table.Id }, CancellationToken.None);
        OrderItemDto line = Assert.Single(bill.Value!.OrderItems);
        Assert.Equal("Adana Menü", line.ProductName);
        Assert.Equal(menu.Id, line.SetMenuId);
        Assert.Equal(160m, line.UnitPrice);
        Assert.Equal(3, line.Components.Count);
        Assert.Equal(160m, bill.Value.TotalPrice);
    }

    [Fact]
    public async Task ScopedKitchen_SeesOnlyComponentsOfItsCategory()
    {
        var (order, _, menu) = await SeedAsync();
        await AddKolaMenuAsync(order, menu);
        DbContext.ChangeTracker.Clear();

        User cook = User.Create("Izgaracı", "", "");
        DbContext.Users.Add(cook);
        UserBranch membership = UserBranch.Create(cook, await DbContext.Branches.SingleAsync(b => b.Id == CurrentUser.BranchId), "izgaraci01", null, UserRole.Kitchen);
        membership.SetCategories([_izgara.Id]);
        DbContext.UserBranches.Add(membership);
        await DbContext.SaveChangesAsync();
        var grill = new FakeCurrentUserService { BranchId = CurrentUser.BranchId, CompanyId = CurrentUser.CompanyId, UserId = cook.Id, Role = "Kitchen" };

        var kitchen = await new GetAllOrdersToKitchenQueryHandler(Db, grill).Handle(new GetAllOrdersToKitchenQuery(), CancellationToken.None);

        Assert.Equal(["Adana Kebap", "Patates"], Assert.Single(kitchen.Value!).OrderItems.Select(i => i.ProductName).Order());
    }

    [Fact]
    public async Task ReadyComponents_NotifyWaiterWithSetName_AndSetLineFollows()
    {
        var (order, _, menu) = await SeedAsync();
        var added = await AddKolaMenuAsync(order, menu);
        List<Guid> grillItemIds = await DbContext.OrderItems
            .Where(i => i.ParentOrderItemId == added.Value && (i.ProductId == _adana.Id || i.ProductId == _patates.Id))
            .Select(i => i.Id)
            .ToListAsync();

        var notifications = new FakeTableNotificationService();
        var handler = new UpdateOrderItemsStatusCommandHandler(Db, notifications, new FakeCashierNotificationService(), CurrentUser);
        var result = await handler.Handle(new UpdateOrderItemsStatusCommand
        {
            OrderId = order.Id,
            OrderItemIds = grillItemIds,
            Status = (int)OrderItemStatus.Ready
        }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        ItemsReadyDto payload = Assert.Single(notifications.ItemsReadySent).Payload;
        Assert.Equal(["Adana Kebap (Adana Menü)", "Patates (Adana Menü)"], payload.Items.Select(i => i.ProductName).Order());
        Assert.Equal(OrderItemStatus.Pending, (await DbContext.OrderItems.SingleAsync(i => i.Id == added.Value)).Status);

        // Son ürün (Kola) da hazır olunca menü satırı Hazır olur; bildirimde menü satırı ayrıca yer almaz.
        Guid kolaId = await DbContext.OrderItems.Where(i => i.ParentOrderItemId == added.Value && i.ProductId == _kola.Id).Select(i => i.Id).SingleAsync();
        await handler.Handle(new UpdateOrderItemsStatusCommand { OrderId = order.Id, OrderItemIds = [kolaId], Status = (int)OrderItemStatus.Ready }, CancellationToken.None);

        Assert.Equal(OrderItemStatus.Ready, (await DbContext.OrderItems.SingleAsync(i => i.Id == added.Value)).Status);
        Assert.Equal(["Kola (Adana Menü)"], notifications.ItemsReadySent[1].Payload.Items.Select(i => i.ProductName));
    }

    // Düzenleyicinin göndereceği gövde: menünün şu anki hali, bölümler Id'leriyle.
    private async Task<UpdateSetMenuCommand> UpdateCommandFromAsync(Guid setMenuId)
    {
        SetMenu menu = await DbContext.SetMenus.AsNoTracking()
            .Include(s => s.Slots).ThenInclude(slot => slot.Options)
            .SingleAsync(s => s.Id == setMenuId);
        return new UpdateSetMenuCommand
        {
            Id = menu.Id,
            Name = menu.Name,
            DiscountType = menu.DiscountType,
            DiscountValue = menu.DiscountValue,
            IsActive = menu.IsActive,
            Slots = menu.Slots.OrderBy(s => s.SortOrder).Select(slot => new SetMenuSlotInput
            {
                Id = slot.Id,
                Name = slot.Name,
                CategoryId = slot.CategoryId,
                Options = slot.Options
                    .Select(o => new SetMenuOptionInput { ProductId = o.ProductId, IsDefault = o.IsDefault, DiscountType = o.DiscountType, DiscountValue = o.DiscountValue })
                    .ToList()
            }).ToList()
        };
    }

    private async Task<List<SetMenuSlot>> SlotsOfAsync(Guid setMenuId)
    {
        DbContext.ChangeTracker.Clear();
        return await DbContext.SetMenuSlots.Include(s => s.Options)
            .Where(s => s.SetMenuId == setMenuId)
            .OrderBy(s => s.SortOrder)
            .ToListAsync();
    }

    private Task<RestaurantBill.Domain.Shared.Result> UpdateAsync(UpdateSetMenuCommand command) =>
        new UpdateSetMenuCommandHandler(Db, CurrentUser).Handle(command, CancellationToken.None);

    [Fact]
    public async Task UpdateSetMenu_KeepsSlotIds_SoAnOpenWaiterPickerStillWorks()
    {
        var (order, _, menu) = await SeedAsync();
        List<Guid> slotIdsBefore = menu.Slots.OrderBy(s => s.SortOrder).Select(s => s.Id).ToList();

        // Önce yalnızca "Satış dışı", sonra yeniden "Satışta" + indirim değişikliği.
        UpdateSetMenuCommand deactivate = await UpdateCommandFromAsync(menu.Id);
        deactivate.IsActive = false;
        Assert.True((await UpdateAsync(deactivate)).IsSuccess);
        Assert.Equal(slotIdsBefore, (await SlotsOfAsync(menu.Id)).Select(s => s.Id));

        // Menüye 20 ₺ indirim (150 → 130), Kola'ya 5 ₺ indirim (40 → 35, ek ücret 10 → 5).
        UpdateSetMenuCommand edit = await UpdateCommandFromAsync(menu.Id);
        edit.IsActive = true;
        edit.DiscountType = DiscountType.Amount;
        edit.DiscountValue = 20m;
        SetMenuOptionInput kola = edit.Slots[1].Options.Single(o => o.ProductId == _kola.Id);
        kola.DiscountType = DiscountType.Amount;
        kola.DiscountValue = 5m;
        var result = await UpdateAsync(edit);

        Assert.True(result.IsSuccess, result.Error);
        List<SetMenuSlot> slots = await SlotsOfAsync(menu.Id);
        Assert.Equal(slotIdsBefore, slots.Select(s => s.Id));
        Assert.Equal(5m, slots[1].Options.Single(o => o.ProductId == _kola.Id).Surcharge);
        Assert.Equal(130m, (await DbContext.SetMenus.SingleAsync(s => s.Id == menu.Id)).Price);

        // Düzenlemeden önce açılmış seçim ekranı, elindeki (eski) menünün bölüm Id'siyle gönderir; hâlâ geçerlidir.
        var added = await AddKolaMenuAsync(order, menu);
        Assert.True(added.IsSuccess, added.Error);
        Assert.Equal(135m, (await DbContext.OrderItems.SingleAsync(i => i.Id == added.Value)).UnitPrice);
    }

    [Fact]
    public async Task UpdateSetMenu_SetsFeatured_AndKeepsItWhenFlagIsOmitted()
    {
        var (_, _, menu) = await SeedAsync();

        UpdateSetMenuCommand feature = await UpdateCommandFromAsync(menu.Id);
        feature.IsFeatured = true;
        Assert.True((await UpdateAsync(feature)).IsSuccess);
        DbContext.ChangeTracker.Clear();
        Assert.True((await DbContext.SetMenus.SingleAsync(s => s.Id == menu.Id)).IsFeatured);

        // Older clients do not send the flag: the current value must be kept.
        UpdateSetMenuCommand withoutFlag = await UpdateCommandFromAsync(menu.Id);
        Assert.Null(withoutFlag.IsFeatured);
        Assert.True((await UpdateAsync(withoutFlag)).IsSuccess);
        DbContext.ChangeTracker.Clear();
        Assert.True((await DbContext.SetMenus.SingleAsync(s => s.Id == menu.Id)).IsFeatured);

        UpdateSetMenuCommand unfeature = await UpdateCommandFromAsync(menu.Id);
        unfeature.IsFeatured = false;
        Assert.True((await UpdateAsync(unfeature)).IsSuccess);
        DbContext.ChangeTracker.Clear();
        Assert.False((await DbContext.SetMenus.SingleAsync(s => s.Id == menu.Id)).IsFeatured);
    }

    [Fact]
    public async Task UpdateSetMenu_RemovingSlot_DeletesItAndItsOptions()
    {
        var (_, _, menu) = await SeedAsync();
        UpdateSetMenuCommand command = await UpdateCommandFromAsync(menu.Id);
        Guid removedSlotId = command.Slots[2].Id!.Value;

        command.Slots.RemoveAt(2);
        var result = await UpdateAsync(command);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(["Ana yemek", "İçecek"], (await SlotsOfAsync(menu.Id)).Select(s => s.Name));
        Assert.False(await DbContext.SetMenuSlots.AnyAsync(s => s.Id == removedSlotId));
        Assert.False(await DbContext.SetMenuSlotOptions.AnyAsync(o => o.SetMenuSlotId == removedSlotId));
    }

    [Fact]
    public async Task UpdateSetMenu_AddingSlotAndOption_KeepsExistingIds()
    {
        var (_, _, menu) = await SeedAsync();
        UpdateSetMenuCommand command = await UpdateCommandFromAsync(menu.Id);
        List<Guid?> existingIds = command.Slots.Select(s => s.Id).ToList();

        command.Slots[0].Options.Add(new SetMenuOptionInput { ProductId = _patates.Id });
        command.Slots.Add(new SetMenuSlotInput { Name = "Tatlı içecek", Options = [new SetMenuOptionInput { ProductId = _kola.Id }] });
        var result = await UpdateAsync(command);

        Assert.True(result.IsSuccess, result.Error);
        List<SetMenuSlot> slots = await SlotsOfAsync(menu.Id);
        Assert.Equal(4, slots.Count);
        Assert.Equal(existingIds, slots.Take(3).Select(s => (Guid?)s.Id));
        Assert.Equal("Tatlı içecek", slots[3].Name);
        Assert.Equal(2, slots[0].Options.Count);
        Assert.False(slots[0].IsFixed);
    }

    [Fact]
    public async Task UpdatingProductPrice_RecalculatesMenuPriceAndSurcharge()
    {
        var (_, _, menu) = await SeedAsync();

        var result = await new UpdateProductCommandHandler(Db, CurrentUser).Handle(new UpdateProductCommand
        {
            Id = _kola.Id,
            Name = _kola.Name,
            Price = 55m,
            IsActive = true,
            CategoryId = _icecek.Id
        }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        DbContext.ChangeTracker.Clear();
        SetMenu reloaded = await DbContext.SetMenus.Include(s => s.Slots).ThenInclude(slot => slot.Options).SingleAsync(s => s.Id == menu.Id);
        Assert.Equal(150m, reloaded.Price); // Kola varsayılan değil, taban fiyat değişmez
        Assert.Equal(25m, reloaded.Slots.Single(s => s.Name == "İçecek").Options.Single(o => o.ProductId == _kola.Id).Surcharge);
    }

    [Fact]
    public async Task SlotWithCategory_TakesTheCategoryName_AndRejectsProductsOfOtherCategories()
    {
        var (_, _, menu) = await SeedAsync();
        UpdateSetMenuCommand command = await UpdateCommandFromAsync(menu.Id);
        command.Slots[1].CategoryId = _icecek.Id;
        command.Slots[1].Name = "eski ad";

        Assert.True((await UpdateAsync(command)).IsSuccess);
        SetMenuSlot drinks = (await SlotsOfAsync(menu.Id))[1];
        Assert.Equal("İçecek", drinks.Name);
        Assert.Equal(_icecek.Id, drinks.CategoryId);

        UpdateSetMenuCommand wrong = await UpdateCommandFromAsync(menu.Id);
        wrong.Slots[1].Options.Add(new SetMenuOptionInput { ProductId = _patates.Id });
        Assert.True((await UpdateAsync(wrong)).IsFailure);
    }

    [Fact]
    public async Task UpdateSetMenu_WithSlotIdOfAnotherMenu_IsRejected()
    {
        var (_, _, menu) = await SeedAsync();
        UpdateSetMenuCommand command = await UpdateCommandFromAsync(menu.Id);
        command.Slots[0].Id = Guid.NewGuid();

        var result = await UpdateAsync(command);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task GetSetMenusWithCost_ReturnsEstimatedCostFromDefaults()
    {
        await SeedAsync();
        var options = Options.Create(new BunnyStorageOptions { CdnBaseUrl = "https://cdn.test" });

        var withCost = await new GetSetMenusQueryHandler(Db, CurrentUser, options).Handle(new GetSetMenusQuery { IncludeCost = true }, CancellationToken.None);
        var withoutCost = await new GetSetMenusQueryHandler(Db, CurrentUser, options).Handle(new GetSetMenusQuery(), CancellationToken.None);

        SetMenuDto menu = Assert.Single(withCost.Value!);
        Assert.Equal(60m + 5m + 8m, menu.EstimatedCost);
        Assert.Equal(["Ana yemek", "İçecek", "Yan ürün"], menu.Slots.Select(s => s.Name));
        Assert.True(menu.Slots[0].IsFixed);
        Assert.Null(Assert.Single(withoutCost.Value!).EstimatedCost);
        Assert.All(withoutCost.Value!.Single().Slots.SelectMany(s => s.Options), o => Assert.Null(o.Cost));
    }

    [Fact]
    public async Task DeleteProduct_UsedInSetMenu_IsRejected()
    {
        await SeedAsync();

        var result = await new RestaurantBill.Application.Features.Products.Commands.DeleteProduct.DeleteProductCommandHandler(Db, CurrentUser, new FakeImageStorageService())
            .Handle(new RestaurantBill.Application.Features.Products.Commands.DeleteProduct.DeleteProductCommand { Id = _kola.Id }, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Contains("Adana Menü", result.Error);
    }
}
