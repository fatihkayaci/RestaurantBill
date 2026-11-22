using FluentValidation.TestHelper;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Categories.Commands.UpdateCategory;
using RestaurantBill.Application.Features.CustomerSite.Public;
using RestaurantBill.Application.Features.Delivery.Public;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Delivery;

// Kategorinin müşteri menüsündeki görünümü (otomatik / kart / liste) ve admin'in "Yeni" etiketi (30 gün): admin güncellemesi,
// sitenin ve paket sipariş menüsünün DTO'ları.
public class MenuDisplayAndNewTagTests : DeliveryTestBase
{
    private static IOptions<BunnyStorageOptions> CdnOptions() => Options.Create(new BunnyStorageOptions { CdnBaseUrl = "https://cdn.test" });

    [Fact]
    public async Task UpdateCategory_SetsMenuDisplay_AndNullKeepsIt()
    {
        await SeedAsync();
        var handler = new UpdateCategoryCommandHandler(Db, CurrentUser);

        var result = await handler.Handle(new UpdateCategoryCommand { Id = Category.Id, Name = "Ana yemek", MenuDisplay = CategoryMenuDisplay.List }, CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(CategoryMenuDisplay.List, Category.MenuDisplay);

        result = await handler.Handle(new UpdateCategoryCommand { Id = Category.Id, Name = "Ana yemekler" }, CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(CategoryMenuDisplay.List, Category.MenuDisplay);
    }

    [Fact]
    public void UpdateCategoryValidator_RejectsUnknownMenuDisplay()
        => new UpdateCategoryCommandValidator()
            .TestValidate(new UpdateCategoryCommand { Id = Guid.NewGuid(), Name = "Tatlı", MenuDisplay = (CategoryMenuDisplay)9 })
            .ShouldHaveValidationErrorFor(x => x.MenuDisplay);

    [Fact]
    public async Task PublicSiteAndOnlineMenu_ExposeMenuDisplayAndNewTag()
    {
        await SeedAsync();
        Category.SetMenuDisplay(CategoryMenuDisplay.Cards);
        DateTime now = Clock.GetUtcNow().UtcDateTime;
        Adana.SetNew(true, now);
        Ayran.SetNew(true, now.AddDays(-31)); // süresi dolmuş
        await DbContext.SaveChangesAsync();

        var site = await new GetPublicSiteQueryHandler(Db, Tenant, CdnOptions()).Handle(new GetPublicSiteQuery(), CancellationToken.None);
        Assert.True(site.IsSuccess, site.Error);
        var siteCategory = site.Value!.Categories.Single(c => c.Id == Category.Id);
        Assert.Equal("cards", siteCategory.MenuDisplay);
        Assert.True(siteCategory.Products.Single(p => p.Id == Adana.Id).IsNew);
        Assert.False(siteCategory.Products.Single(p => p.Id == Ayran.Id).IsNew);
        Assert.False(siteCategory.Products.Single(p => p.Id == Kola.Id).IsNew);

        var online = await new GetOnlineOrderingQueryHandler(Db, Tenant, CdnOptions(), Sms, Clock)
            .Handle(new GetOnlineOrderingQuery(), CancellationToken.None);
        Assert.True(online.IsSuccess, online.Error);
        var onlineCategory = online.Value!.Categories.Single(c => c.Id == Category.Id);
        Assert.Equal("cards", onlineCategory.MenuDisplay);
        Assert.True(onlineCategory.Products.Single(p => p.Id == Adana.Id).IsNew);
        Assert.False(onlineCategory.Products.Single(p => p.Id == Ayran.Id).IsNew);
    }

    [Fact]
    public async Task DefaultMenuDisplay_IsAuto()
    {
        await SeedAsync();
        var site = await new GetPublicSiteQueryHandler(Db, Tenant, CdnOptions()).Handle(new GetPublicSiteQuery(), CancellationToken.None);
        Assert.Equal("auto", site.Value!.Categories.Single(c => c.Id == Category.Id).MenuDisplay);
    }
}
