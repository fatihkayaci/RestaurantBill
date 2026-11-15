using System.Reflection;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

// "Adana Menü" = Adana Kebap (100, sabit) + İçecek (Ayran 30 varsayılan / Kola 40 → +10 ₺) + Patates (20, sabit) = 150 ₺.
public class SetMenuOrderTests
{
    private readonly Product _adana = CreateProduct("Adana Kebap", 100m, cost: 60m);
    private readonly Product _ayran = CreateProduct("Ayran", 30m, cost: 5m);
    private readonly Product _kola = CreateProduct("Kola", 40m, cost: 12m);
    private readonly Product _patates = CreateProduct("Patates", 20m, cost: 8m);
    private readonly SetMenu _menu;
    private readonly SetMenuSlot _drinkSlot;

    public SetMenuOrderTests()
    {
        _menu = SetMenu.Create(Guid.NewGuid(), "Adana Menü");
        SetId(_menu, Guid.NewGuid());
        _menu.SetContents([
            new SetMenuSlotDraft("Ana yemek", [new SetMenuOptionDraft(_adana, false)]),
            new SetMenuSlotDraft("İçecek", [new SetMenuOptionDraft(_ayran, true), new SetMenuOptionDraft(_kola, false)]),
            new SetMenuSlotDraft("Yan ürün", [new SetMenuOptionDraft(_patates, false)]),
        ], DiscountType.None, 0m);
        foreach (SetMenuSlot slot in _menu.Slots)
            SetId(slot, Guid.NewGuid());
        _drinkSlot = _menu.Slots.Single(s => s.Name == "İçecek");
    }

    private static readonly Dictionary<Guid, Guid> NoSelection = [];

    private static Product CreateProduct(string name, decimal price = 50m, decimal cost = 0m)
    {
        Product product = Product.Create(name, price, "", Guid.NewGuid());
        SetId(product, Guid.NewGuid());
        product.SetCost(cost);
        return product;
    }

    private static void SetId(BaseEntity entity, Guid id) =>
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    // Veritabanına yazılmadan kalemlerin Id'si yoktur; Id ile çalışan metotlar için testte verilir.
    private static void AssignItemIds(Order order)
    {
        foreach (OrderItem item in order.OrderItems.Where(i => i.Id == Guid.Empty))
            SetId(item, Guid.NewGuid());
    }

    private Order OrderWithMenu(Dictionary<Guid, Guid>? selections = null, int quantity = 1)
    {
        Order order = Order.Create(Guid.NewGuid(), Guid.NewGuid());
        order.AddSetMenu(_menu, selections ?? NoSelection, quantity, taxRate: 10m);
        AssignItemIds(order);
        return order;
    }

    private static OrderItem SetLine(Order order) => order.OrderItems.Single(i => i.IsSetMenu);

    [Fact]
    public void AddSetMenu_CreatesOneLineWithSetPriceAndZeroPricedComponents()
    {
        Order order = OrderWithMenu(new Dictionary<Guid, Guid> { [_drinkSlot.Id] = _kola.Id }, quantity: 2);

        OrderItem line = SetLine(order);
        Assert.Equal(160m, line.UnitPrice);
        Assert.Equal(2, line.Quantity);
        Assert.Null(line.ProductId);

        IReadOnlyList<OrderItem> components = order.GetSetMenuComponents(line);
        Assert.Equal(["Adana Kebap", "Kola", "Patates"], components.Select(c => c.Product!.Name));
        Assert.All(components, c => Assert.Equal(0m, c.UnitPrice));
        Assert.All(components, c => Assert.Equal(2, c.Quantity));
        Assert.Equal(320m, order.TotalPrice);
    }

    [Fact]
    public void AddSetMenu_WithoutSelection_UsesDefaultOption()
    {
        Order order = OrderWithMenu();

        Assert.Equal(150m, SetLine(order).UnitPrice);
        Assert.Contains(order.GetSetMenuComponents(SetLine(order)), c => c.ProductId == _ayran.Id);
    }

    [Fact]
    public void AddSetMenu_WithProductOutsideSlot_Throws()
    {
        Order order = Order.Create(Guid.NewGuid(), Guid.NewGuid());

        Assert.Throws<DomainException>(() =>
            order.AddSetMenu(_menu, new Dictionary<Guid, Guid> { [_drinkSlot.Id] = _adana.Id }, 1, 10m));
        Assert.Empty(order.OrderItems);
    }

    [Fact]
    public void AddSetMenu_WithUnknownSlot_Throws()
    {
        Order order = Order.Create(Guid.NewGuid(), Guid.NewGuid());

        Assert.Throws<DomainException>(() =>
            order.AddSetMenu(_menu, new Dictionary<Guid, Guid> { [Guid.NewGuid()] = _kola.Id }, 1, 10m));
    }

    [Fact]
    public void AddSetMenu_ChoiceSlotWithoutDefault_RequiresSelection()
    {
        SetMenu menu = SetMenu.Create(Guid.NewGuid(), "İçecek Menü");
        menu.SetContents([new SetMenuSlotDraft("İçecek", [new SetMenuOptionDraft(_ayran, false), new SetMenuOptionDraft(_kola, false)])], DiscountType.None, 0m);
        SetId(menu.Slots.Single(), Guid.NewGuid());

        Assert.Throws<DomainException>(() => Order.Create(Guid.NewGuid(), Guid.NewGuid()).AddSetMenu(menu, NoSelection, 1, 10m));
    }

    [Fact]
    public void AddSetMenu_WhenSetOrChosenProductInactive_Throws()
    {
        _kola.Update(_kola.Name, _kola.Price, isActive: false, _kola.CategoryId);
        Assert.Throws<DomainException>(() =>
            Order.Create(Guid.NewGuid(), Guid.NewGuid()).AddSetMenu(_menu, new Dictionary<Guid, Guid> { [_drinkSlot.Id] = _kola.Id }, 1, 10m));

        _menu.Update(_menu.Name, null, isActive: false, sortOrder: 0, categoryId: null);
        Assert.Throws<DomainException>(() => Order.Create(Guid.NewGuid(), Guid.NewGuid()).AddSetMenu(_menu, NoSelection, 1, 10m));
    }

    [Fact]
    public void SetLines_AreNeverMerged_AndProductsDoNotMergeIntoComponents()
    {
        Order order = OrderWithMenu();
        order.AddSetMenu(_menu, NoSelection, 1, 10m);
        order.AddItem(_ayran, 1);

        Assert.Equal(2, order.OrderItems.Count(i => i.IsSetMenu));
        OrderItem standaloneAyran = Assert.Single(order.OrderItems, i => i.ProductId == _ayran.Id && !i.IsSetMenuComponent);
        Assert.Equal(_ayran.Price, standaloneAyran.UnitPrice);
        Assert.Equal(300m + _ayran.Price, order.TotalPrice);
    }

    [Fact]
    public void SetLineStatus_FollowsTheSlowestComponent()
    {
        Order order = OrderWithMenu();
        OrderItem line = SetLine(order);
        List<OrderItem> components = order.GetSetMenuComponents(line).ToList();

        order.UpdateItemStatus(components[0].Id, OrderItemStatus.Ready);
        Assert.Equal(OrderItemStatus.Pending, line.Status);

        order.UpdateItemStatus(components[1].Id, OrderItemStatus.Ready);
        order.UpdateItemStatus(components[2].Id, OrderItemStatus.Ready);
        Assert.Equal(OrderItemStatus.Ready, line.Status);
    }

    [Fact]
    public void StatusGivenToSetLine_AppliesToAllComponents()
    {
        Order order = OrderWithMenu();
        OrderItem line = SetLine(order);

        order.UpdateItemStatus(line.Id, OrderItemStatus.Served);

        Assert.All(order.GetSetMenuComponents(line), c => Assert.Equal(OrderItemStatus.Served, c.Status));
        Assert.Equal(OrderItemStatus.Served, line.Status);
    }

    [Fact]
    public void ScopedKitchenPass_MovesOnlyItsComponents_AndOrderWaitsForTheRest()
    {
        Order order = OrderWithMenu();
        OrderItem line = SetLine(order);

        order.UpdateStatusForItems(OrderStatus.Ready, i => i.ProductId == _adana.Id);

        Assert.Equal(OrderItemStatus.Ready, order.OrderItems.Single(i => i.ProductId == _adana.Id).Status);
        Assert.Equal(OrderItemStatus.Pending, line.Status);
        Assert.NotEqual(OrderStatus.Ready, order.Status);

        order.UpdateStatus(OrderStatus.Ready);
        Assert.Equal(OrderItemStatus.Ready, line.Status);
    }

    [Fact]
    public void SettlingSetLine_SettlesItsComponents()
    {
        Order order = OrderWithMenu(quantity: 2);
        OrderItem line = SetLine(order);

        order.SettleItem(line.Id, 1);
        Assert.Equal(1, line.Quantity);
        Assert.All(order.GetSetMenuComponents(line), c => Assert.Equal(1, c.Quantity));
        Assert.Equal(150m, order.TotalPrice);

        order.SettleItem(line.Id, 1);
        Assert.Empty(order.OrderItems);
    }

    [Fact]
    public void Component_CannotBePaidRemovedOrResizedOnItsOwn()
    {
        Order order = OrderWithMenu();
        OrderItem component = order.GetSetMenuComponents(SetLine(order))[0];

        Assert.Throws<DomainException>(() => order.SettleItem(component.Id, 1));
        Assert.Throws<DomainException>(() => order.RemoveOrderItem(component.Id));
        Assert.Throws<DomainException>(() => order.UpdateOrderItemQuantity(component.Id, 3));
        // Ürün Id'siyle çıkarma menünün içindeki ürünü bulmaz.
        Assert.Throws<DomainException>(() => order.RemoveItem(_adana.Id));
    }

    [Fact]
    public void RemovingSetLine_RemovesItsComponents()
    {
        Order order = OrderWithMenu();

        order.RemoveOrderItem(SetLine(order).Id);

        Assert.Empty(order.OrderItems);
        Assert.Equal(0m, order.TotalPrice);
    }

    [Fact]
    public void ChangingSetLineQuantity_ChangesComponents_OnlyWhileAllPending()
    {
        Order order = OrderWithMenu();
        OrderItem line = SetLine(order);

        order.UpdateOrderItemQuantity(line.Id, 3);
        Assert.All(order.GetSetMenuComponents(line), c => Assert.Equal(3, c.Quantity));
        Assert.Equal(450m, order.TotalPrice);

        order.UpdateItemStatus(order.GetSetMenuComponents(line)[0].Id, OrderItemStatus.Ready);
        Assert.Throws<DomainException>(() => order.UpdateOrderItemQuantity(line.Id, 4));
    }

    [Fact]
    public void MergeFrom_MovesSetLinesIntact()
    {
        Order target = OrderWithMenu();
        Order source = OrderWithMenu(new Dictionary<Guid, Guid> { [_drinkSlot.Id] = _kola.Id });

        target.MergeFrom(source);

        Assert.Equal(2, target.OrderItems.Count(i => i.IsSetMenu));
        Assert.All(target.OrderItems.Where(i => i.IsSetMenu), l => Assert.Equal(3, target.GetSetMenuComponents(l).Count));
        Assert.Equal(310m, target.TotalPrice);
        Assert.Empty(source.OrderItems);
    }

    [Fact]
    public void EstimatedCost_UsesDefaultOptions()
    {
        Assert.Equal(60m + 5m + 8m, _menu.GetEstimatedCost());
    }

    [Fact]
    public void RegularPrice_WithoutDiscounts_EqualsPrice()
    {
        Assert.Equal(100m + 30m + 20m, _menu.GetRegularPrice());
        Assert.Equal(_menu.Price, _menu.GetRegularPrice());
    }

    [Fact]
    public void RegularPrice_WithProductAndMenuDiscounts_IsUndiscountedBaseProducts()
    {
        // Adana %10 → 90, Ayran 30, Patates 20 = 140; menü indirimi 20 ₺ → 120. İndirimsiz: 100 + 30 + 20 = 150.
        _menu.SetContents([
            new SetMenuSlotDraft("Ana yemek", [new SetMenuOptionDraft(_adana, false, DiscountType.Percent, 10m)]),
            new SetMenuSlotDraft("İçecek", [new SetMenuOptionDraft(_ayran, true), new SetMenuOptionDraft(_kola, false)]),
            new SetMenuSlotDraft("Yan ürün", [new SetMenuOptionDraft(_patates, false)]),
        ], DiscountType.Amount, 20m);

        Assert.Equal(120m, _menu.Price);
        Assert.Equal(150m, _menu.GetRegularPrice());
        Assert.True(_menu.GetRegularPrice() > _menu.Price);
    }

    [Fact]
    public void RegularPrice_ChoiceSlotWithoutDefault_UsesCheapestAfterDiscount()
    {
        // Kola 40 → %50 ile 20, Ayran 30'dan ucuz: taban seçenek Kola, normal fiyatı 40.
        SetMenu menu = SetMenu.Create(Guid.NewGuid(), "İçecek Menü");
        menu.SetContents([new SetMenuSlotDraft("İçecek",
            [new SetMenuOptionDraft(_ayran, false), new SetMenuOptionDraft(_kola, false, DiscountType.Percent, 50m)])], DiscountType.None, 0m);

        Assert.Equal(20m, menu.Price);
        Assert.Equal(40m, menu.GetRegularPrice());
    }

    [Fact]
    public void SetContents_RejectsEmptySlotsDuplicatesAndTwoDefaults()
    {
        Assert.Throws<DomainException>(() => _menu.SetContents([], DiscountType.None, 0m));
        Assert.Throws<DomainException>(() => _menu.SetContents([new SetMenuSlotDraft("İçecek", [])], DiscountType.None, 0m));
        Assert.Throws<DomainException>(() => _menu.SetContents([
            new SetMenuSlotDraft("İçecek", [new SetMenuOptionDraft(_kola, false), new SetMenuOptionDraft(_kola, false)])], DiscountType.None, 0m));
        Assert.Throws<DomainException>(() => _menu.SetContents([
            new SetMenuSlotDraft("İçecek", [new SetMenuOptionDraft(_ayran, true), new SetMenuOptionDraft(_kola, true)])], DiscountType.None, 0m));
    }

    /* ── Fiyat: ürünlerden hesaplanır ── */

    [Fact]
    public void Price_IsSumOfDefaultOptions_AndSurchargeIsThePriceDifference()
    {
        Assert.Equal(150m, _menu.Price);
        Assert.Equal(150m, _menu.GetListPrice());
        Assert.Equal(10m, _drinkSlot.Options.Single(o => o.ProductId == _kola.Id).Surcharge);
        Assert.Equal(0m, _drinkSlot.Options.Single(o => o.ProductId == _ayran.Id).Surcharge);
    }

    [Fact]
    public void ChoiceSlotWithoutDefault_UsesTheCheapestOptionAsBase()
    {
        SetMenu menu = SetMenu.Create(Guid.NewGuid(), "İçecek Menü");
        menu.SetContents([new SetMenuSlotDraft("İçecek", [new SetMenuOptionDraft(_kola, false), new SetMenuOptionDraft(_ayran, false)])], DiscountType.None, 0m);

        Assert.Equal(30m, menu.Price);
        Assert.Equal(10m, menu.Slots.Single().Options.Single(o => o.ProductId == _kola.Id).Surcharge);
    }

    [Fact]
    public void ProductDiscounts_PercentAndAmount_LowerPriceAndSurcharge()
    {
        // Adana %10 (100 → 90), Kola 5 ₺ (40 → 35, ek ücret 5).
        _menu.SetContents([
            new SetMenuSlotDraft("Ana yemek", [new SetMenuOptionDraft(_adana, false, DiscountType.Percent, 10m)], SlotId("Ana yemek")),
            new SetMenuSlotDraft("İçecek", [new SetMenuOptionDraft(_ayran, true), new SetMenuOptionDraft(_kola, false, DiscountType.Amount, 5m)], _drinkSlot.Id),
            new SetMenuSlotDraft("Yan ürün", [new SetMenuOptionDraft(_patates, false)], SlotId("Yan ürün")),
        ], DiscountType.None, 0m);

        Assert.Equal(90m + 30m + 20m, _menu.Price);
        Assert.Equal(5m, _drinkSlot.Options.Single(o => o.ProductId == _kola.Id).Surcharge);
    }

    [Theory]
    [InlineData(DiscountType.Percent, 10, 135)]
    [InlineData(DiscountType.Amount, 25, 125)]
    public void MenuDiscount_IsAppliedToTheListPrice(DiscountType type, decimal value, decimal expected)
    {
        _menu.SetContents(SameSlots(), type, value);

        Assert.Equal(150m, _menu.GetListPrice());
        Assert.Equal(expected, _menu.Price);
        // Ek ücret menü indiriminden etkilenmez.
        Assert.Equal(expected + 10m, SetLine(OrderWithMenu(new Dictionary<Guid, Guid> { [_drinkSlot.Id] = _kola.Id })).UnitPrice);
    }

    [Fact]
    public void RecalculatePrice_FollowsProductPriceChanges()
    {
        _kola.Update(_kola.Name, 50m, _kola.IsActive, _kola.CategoryId);
        _adana.Update(_adana.Name, 120m, _adana.IsActive, _adana.CategoryId);

        _menu.RecalculatePrice();

        Assert.Equal(120m + 30m + 20m, _menu.Price);
        Assert.Equal(20m, _drinkSlot.Options.Single(o => o.ProductId == _kola.Id).Surcharge);
    }

    [Fact]
    public void FreeMenu_OrInvalidDiscounts_Throw()
    {
        Assert.Throws<DomainException>(() => _menu.SetContents(SameSlots(), DiscountType.Amount, 150m));
        Assert.Throws<DomainException>(() => _menu.SetContents(SameSlots(), DiscountType.Percent, 101m));
        Assert.Throws<DomainException>(() => _menu.SetContents(SameSlots(), DiscountType.Amount, -1m));
        Assert.Throws<DomainException>(() => _menu.SetContents(SameSlots(), DiscountType.None, 5m));
        Assert.Throws<DomainException>(() => _menu.SetContents([
            new SetMenuSlotDraft("Ana yemek", [new SetMenuOptionDraft(_adana, false, DiscountType.Percent, 150m)])], DiscountType.None, 0m));
    }

    [Fact]
    public void MenuWhosePriceDroppedToZero_CannotBeOrdered()
    {
        _menu.SetContents(SameSlots(), DiscountType.Amount, 100m);
        _adana.Update(_adana.Name, 10m, _adana.IsActive, _adana.CategoryId);
        _menu.RecalculatePrice();

        Assert.Equal(0m, _menu.Price);
        Assert.Throws<DomainException>(() => OrderWithMenu());
    }

    [Fact]
    public void SlotCategory_OnlyAcceptsProductsOfThatCategory()
    {
        Guid drinks = Guid.NewGuid();
        Product su = Product.Create("Su", 10m, "", drinks);

        Assert.Throws<DomainException>(() => _menu.SetContents([
            new SetMenuSlotDraft("İçecekler", [new SetMenuOptionDraft(su, true), new SetMenuOptionDraft(_kola, false)], CategoryId: drinks)], DiscountType.None, 0m));

        _menu.SetContents([new SetMenuSlotDraft("İçecekler", [new SetMenuOptionDraft(su, true)], CategoryId: drinks)], DiscountType.None, 0m);
        Assert.Equal(drinks, _menu.Slots.Single().CategoryId);
    }

    private Guid SlotId(string name) => _menu.Slots.Single(s => s.Name == name).Id;

    // Menünün mevcut bölümleri, indirimsiz ve Id'leriyle (yerinde güncellensin).
    private List<SetMenuSlotDraft> SameSlots() =>
        _menu.Slots.Select(slot => new SetMenuSlotDraft(
            slot.Name,
            slot.Options.Select(o => new SetMenuOptionDraft(o.Product, o.IsDefault)).ToList(),
            slot.Id)).ToList();
}
