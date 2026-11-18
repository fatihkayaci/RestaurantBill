using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.CustomerSite.Public;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Delivery;

// Restoran sitesinin ana sayfası paket menüleri gösterir: yalnız aktif menüler, pasif ürünün seçeneği listelenmez.
public class PublicSiteSetMenuTests : DeliveryTestBase
{
    private Task<RestaurantBill.Domain.Shared.Result<RestaurantBill.Application.DTOs.CustomerSite.PublicSiteDto>> GetSiteAsync()
        => new GetPublicSiteQueryHandler(Db, Tenant, Options.Create(new BunnyStorageOptions()))
            .Handle(new GetPublicSiteQuery(), CancellationToken.None);

    [Fact]
    public async Task Site_ListsActiveSetMenu_WithSlotsPriceAndSurcharges()
    {
        await SeedAsync();
        Ayran.SetOutOfStock(true);
        await DbContext.SaveChangesAsync();

        var result = await GetSiteAsync();

        Assert.True(result.IsSuccess, result.Error);
        OnlineSetMenuDto menu = Assert.Single(result.Value!.SetMenus);
        Assert.Equal("Adana Menü", menu.Name);
        Assert.Equal(250m, menu.Price);
        // Adana 300 + Ayran 30, menü indirimi 80 öncesi.
        Assert.Equal(330m, menu.RegularPrice);
        Assert.Equal(new[] { "Ana yemek", "İçecek" }, menu.Slots.Select(s => s.Name).ToArray());
        Assert.True(menu.Slots[0].IsFixed);
        OnlineSetMenuSlotDto drink = menu.Slots[1];
        Assert.Equal(10m, drink.Options.Single(o => o.ProductId == Kola.Id).Surcharge);
        // Tükenen ürün vitrinden düşmez, yalnız işaretlenir.
        Assert.False(drink.Options.Single(o => o.ProductId == Ayran.Id).IsAvailable);
    }

    [Fact]
    public async Task Site_ExposesFeaturedFlag_ForChefsRecommendation()
    {
        await SeedAsync();
        Assert.False(Assert.Single((await GetSiteAsync()).Value!.SetMenus).IsFeatured);

        AdanaMenu.SetFeatured(true);
        await DbContext.SaveChangesAsync();

        Assert.True(Assert.Single((await GetSiteAsync()).Value!.SetMenus).IsFeatured);
    }

    [Fact]
    public async Task Site_HidesInactiveMenus_AndOptionsOfInactiveProducts()
    {
        await SeedAsync();
        SetMenu hidden = SetMenu.Create(Branch.Id, "Pasif Menü");
        hidden.SetContents([new SetMenuSlotDraft("Ana yemek", [new SetMenuOptionDraft(Lahmacun, true)])], DiscountType.None, 0m);
        hidden.Update(hidden.Name, "", isActive: false, sortOrder: 0, categoryId: null);
        SetMenu broken = SetMenu.Create(Branch.Id, "Kola Menü");
        broken.SetContents([new SetMenuSlotDraft("İçecek", [new SetMenuOptionDraft(Kola, true)])], DiscountType.None, 0m);
        DbContext.SetMenus.AddRange(hidden, broken);
        Kola.Update(Kola.Name, Kola.Price, isActive: false, Kola.CategoryId);
        await DbContext.SaveChangesAsync();

        var result = await GetSiteAsync();

        OnlineSetMenuDto menu = Assert.Single(result.Value!.SetMenus);
        Assert.Equal("Adana Menü", menu.Name);
        Assert.DoesNotContain(menu.Slots[1].Options, o => o.ProductId == Kola.Id);
    }
}
