using System.Reflection;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

// "Adana Menü" (150 ₺) = Adana Kebap (sabit) + İçecek (Ayran varsayılan / Kola +10 ₺) + Patates (sabit).
public class SetMenuOrderTests
{
    private readonly Product _adana = CreateProduct("Adana Kebap", cost: 60m);
    private readonly Product _ayran = CreateProduct("Ayran", cost: 5m);
    private readonly Product _kola = CreateProduct("Kola", cost: 12m);
    private readonly Product _patates = CreateProduct("Patates", cost: 8m);
    private readonly SetMenu _menu;
    private readonly SetMenuSlot _drinkSlot;

    public SetMenuOrderTests()
    {
        _menu = SetMenu.Create(Guid.NewGuid(), "Adana Menü", 150m);
        SetId(_menu, Guid.NewGuid());
        _menu.SetSlots([
            new SetMenuSlotDraft("Ana yemek", [new SetMenuOptionDraft(_adana, 0m, false)]),
            new SetMenuSlotDraft("İçecek", [new SetMenuOptionDraft(_ayran, 0m, true), new SetMenuOptionDraft(_kola, 10m, false)]),
            new SetMenuSlotDraft("Yan ürün", [new SetMenuOptionDraft(_patates, 0m, false)]),
        ]);
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
        SetMenu menu = SetMenu.Create(Guid.NewGuid(), "İçecek Menü", 40m);
        menu.SetSlots([new SetMenuSlotDraft("İçecek", [new SetMenuOptionDraft(_ayran, 0m, false), new SetMenuOptionDraft(_kola, 0m, false)])]);
        SetId(menu.Slots.Single(), Guid.NewGuid());

        Assert.Throws<DomainException>(() => Order.Create(Guid.NewGuid(), Guid.NewGuid()).AddSetMenu(menu, NoSelection, 1, 10m));
    }

    [Fact]
    public void AddSetMenu_WhenSetOrChosenProductInactive_Throws()
    {
        _kola.Update(_kola.Name, _kola.Price, isActive: false, _kola.CategoryId);
        Assert.Throws<DomainException>(() =>
            Order.Create(Guid.NewGuid(), Guid.NewGuid()).AddSetMenu(_menu, new Dictionary<Guid, Guid> { [_drinkSlot.Id] = _kola.Id }, 1, 10m));

        _menu.Update(_menu.Name, null, _menu.Price, isActive: false, sortOrder: 0, categoryId: null);
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
    public void SetSlots_RejectsEmptySlotsDuplicatesAndTwoDefaults()
    {
        Assert.Throws<DomainException>(() => _menu.SetSlots([]));
        Assert.Throws<DomainException>(() => _menu.SetSlots([new SetMenuSlotDraft("İçecek", [])]));
        Assert.Throws<DomainException>(() => _menu.SetSlots([
            new SetMenuSlotDraft("İçecek", [new SetMenuOptionDraft(_kola, 0m, false), new SetMenuOptionDraft(_kola, 5m, false)])]));
        Assert.Throws<DomainException>(() => _menu.SetSlots([
            new SetMenuSlotDraft("İçecek", [new SetMenuOptionDraft(_ayran, 0m, true), new SetMenuOptionDraft(_kola, 0m, true)])]));
    }
}
