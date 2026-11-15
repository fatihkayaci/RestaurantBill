using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.CustomerSite.Public;
using RestaurantBill.Application.Features.Delivery.Public;

namespace RestaurantBill.Application.Tests.Features.Delivery;

// Hazır görsel kütüphanesinden seçilen görseller sitede, QR menüde ve paket sipariş sayfasında "Temsili görsel" diye işaretlenir.
public class StockImageFlagTests : DeliveryTestBase
{
    private static IOptions<BunnyStorageOptions> CdnOptions() => Options.Create(new BunnyStorageOptions { CdnBaseUrl = "https://cdn.test" });

    private async Task SeedImagesAsync()
    {
        await SeedAsync();
        Adana.UpdateImage("shared/stock/adana.webp");
        Ayran.UpdateImage("products/own/ayran.webp");
        AdanaMenu.UpdateImage("shared/stock/adana-menu.webp");
        await DbContext.SaveChangesAsync();
    }

    [Fact]
    public async Task PublicSite_FlagsStockImages_OnProductsAndSetMenus()
    {
        await SeedImagesAsync();

        var result = await new GetPublicSiteQueryHandler(Db, Tenant, CdnOptions()).Handle(new GetPublicSiteQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        var products = result.Value!.Categories.SelectMany(c => c.Products).ToList();
        Assert.True(products.Single(p => p.Id == Adana.Id).IsStockImage);
        Assert.Equal("https://cdn.test/shared/stock/adana.webp", products.Single(p => p.Id == Adana.Id).ImageUrl);
        Assert.False(products.Single(p => p.Id == Ayran.Id).IsStockImage);
        Assert.False(products.Single(p => p.Id == Kola.Id).IsStockImage);
        Assert.True(Assert.Single(result.Value.SetMenus).IsStockImage);
    }

    [Fact]
    public async Task OnlineOrdering_FlagsStockImages_OnProductsAndSetMenus()
    {
        await SeedImagesAsync();

        var result = await new GetOnlineOrderingQueryHandler(Db, Tenant, CdnOptions(), Sms, Clock)
            .Handle(new GetOnlineOrderingQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        var products = result.Value!.Categories.SelectMany(c => c.Products).ToList();
        Assert.True(products.Single(p => p.Id == Adana.Id).IsStockImage);
        Assert.False(products.Single(p => p.Id == Ayran.Id).IsStockImage);
        Assert.True(Assert.Single(result.Value.SetMenus).IsStockImage);
    }
}
