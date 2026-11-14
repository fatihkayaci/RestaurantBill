using RestaurantBill.Application.Features.Orders.Commands.AddSetMenuToOrder;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.Delivery;

// Menü ekleme, siparişin şubesini masadan değil siparişin kendisinden okur: masası olmayan paket siparişte de ürün
// eklemedeki gibi çalışır (eskiden masa aramasında First ile patlıyordu).
public class AddSetMenuToDeliveryOrderTests : DeliveryTestBase
{
    private Task<Result<Guid>> AddMenuAsync(Order order, SetMenu setMenu)
        => new AddSetMenuToOrderCommandHandler(Db, TableNotifications, CashierNotifications, CurrentUser)
            .Handle(new AddSetMenuToOrderCommand { OrderId = order.Id, SetMenuId = setMenu.Id, Quantity = 1 }, CancellationToken.None);

    [Fact]
    public async Task AddSetMenu_ToTablelessDeliveryOrder_Succeeds()
    {
        await SeedAsync();
        DeliveryOrder delivery = await SubmitOkAsync();
        await AcceptOkAsync(delivery);
        Order order = DbContext.Orders.Single(o => o.Id == delivery.OrderId);
        Assert.Null(order.TableId);

        Result<Guid> result = await AddMenuAsync(order, AdanaMenu);

        Assert.True(result.IsSuccess, result.Error);
        OrderItem line = order.OrderItems.Single(i => i.Id == result.Value);
        Assert.True(line.IsSetMenu);
        Assert.Equal(250m, line.UnitPrice);
        Assert.Equal(220m + 250m, order.TotalPrice);
    }

    [Fact]
    public async Task AddSetMenu_FromAnotherBranch_IsNotFound()
    {
        await SeedAsync();
        DeliveryOrder delivery = await SubmitOkAsync();
        await AcceptOkAsync(delivery);
        Order order = DbContext.Orders.Single(o => o.Id == delivery.OrderId);

        SetMenu foreign = SetMenu.Create(Guid.NewGuid(), "Uzak Menü", 100m);
        foreign.SetSlots([new SetMenuSlotDraft("Ana yemek", [new SetMenuOptionDraft(Adana, 0m, true)])]);
        DbContext.SetMenus.Add(foreign);
        await DbContext.SaveChangesAsync();

        Result<Guid> result = await AddMenuAsync(order, foreign);

        Assert.Equal("Böyle bir menü bulunamadı.", result.Error);
    }
}
