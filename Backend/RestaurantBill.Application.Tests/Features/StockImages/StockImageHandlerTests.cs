using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Products.Commands.DeleteProduct;
using RestaurantBill.Application.Features.Products.Commands.SetProductStockImage;
using RestaurantBill.Application.Features.Products.Commands.UploadProductImage;
using RestaurantBill.Application.Features.SetMenus;
using RestaurantBill.Application.Features.StockImages;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Tests.Features.StockImages;

public class StockImageHandlerTests
{
    private const string AdanaKey = "shared/stock/adana.webp";
    private const string CayKey = "shared/stock/cay.webp";
    private const string OwnKey = "products/branch/own.webp";

    private static IOptions<BunnyStorageOptions> Options() =>
        Microsoft.Extensions.Options.Options.Create(new BunnyStorageOptions { CdnBaseUrl = "https://cdn.test/" });

    public class SearchTests : ApplicationTestBase
    {
        private async Task<List<string>> SearchTitlesAsync(string? q)
        {
            var result = await new SearchStockImagesQueryHandler(Db, Options()).Handle(new SearchStockImagesQuery { Q = q }, CancellationToken.None);
            Assert.True(result.IsSuccess, result.Error);
            return result.Value!.Select(i => i.Title).ToList();
        }

        private async Task SeedAsync(params StockImage[] images)
        {
            DbContext.StockImages.AddRange(images);
            await DbContext.SaveChangesAsync();
        }

        [Fact]
        public async Task EmptyCatalog_ReturnsEmptyList()
        {
            Assert.Empty(await SearchTitlesAsync(null));
            Assert.Empty(await SearchTitlesAsync("adana"));
        }

        [Fact]
        public async Task EmptyQuery_ReturnsActiveImagesBySortOrder_WithFullCdnUrl()
        {
            StockImage hidden = StockImage.Create("shared/stock/eski.webp", "Eski", null, null);
            hidden.Update("Eski", null, null, 0, isActive: false);
            await SeedAsync(
                StockImage.Create(CayKey, "Çay", ["sıcak içecek"], "İçecek", sortOrder: 2),
                StockImage.Create(AdanaKey, "Adana", ["kebap"], "Ana yemek", sortOrder: 1),
                hidden);

            var result = await new SearchStockImagesQueryHandler(Db, Options()).Handle(new SearchStockImagesQuery { Q = "  " }, CancellationToken.None);

            Assert.Equal(new[] { "Adana", "Çay" }, result.Value!.Select(i => i.Title).ToArray());
            Assert.Equal("https://cdn.test/shared/stock/adana.webp", result.Value![0].Url);
            Assert.Equal("Ana yemek", result.Value![0].Group);
        }

        [Theory]
        [InlineData("cay")]
        [InlineData("ÇAY")]
        [InlineData("Çay")]
        [InlineData("sicak")]
        public async Task Search_IsTurkishAndDiacriticsInsensitive(string q)
        {
            await SeedAsync(StockImage.Create(CayKey, "Çay", ["sıcak içecek"], "İçecek"), StockImage.Create(AdanaKey, "Adana", ["kebap"], null));

            Assert.Equal(new[] { "Çay" }, await SearchTitlesAsync(q));
        }

        [Fact]
        public async Task Ranking_ExactTitle_ThenKeyword_ThenPrefix_ThenContains()
        {
            await SeedAsync(
                StockImage.Create("shared/stock/1.webp", "Tavuk Şiş", ["şiş"], null, sortOrder: 0),        // contains ("kebaplık" yok) → prefix "kebap" yok
                StockImage.Create("shared/stock/2.webp", "Patlıcan Kebabı", ["kebaplık"], null, sortOrder: 0), // keyword prefix
                StockImage.Create("shared/stock/3.webp", "Adana", ["kebap"], null, sortOrder: 0),           // keyword exact
                StockImage.Create("shared/stock/4.webp", "Kebap", null, null, sortOrder: 9),                // exact title
                StockImage.Create("shared/stock/5.webp", "Şiş Kebap Tabağı", null, null, sortOrder: 0),     // title word prefix
                StockImage.Create("shared/stock/6.webp", "Ciğer", ["ciğerkebap"], null, sortOrder: 0));     // contains

            List<string> titles = await SearchTitlesAsync("kebap");

            Assert.Equal("Kebap", titles[0]);
            Assert.Equal("Adana", titles[1]);
            Assert.Equal(new[] { "Patlıcan Kebabı", "Şiş Kebap Tabağı" }, titles.Skip(2).Take(2).Order().ToArray());
            Assert.Equal("Ciğer", titles[4]);
            Assert.DoesNotContain("Tavuk Şiş", titles);
        }

        [Fact]
        public async Task MultiWordQuery_FromProductName_FindsByWords_MostWordsFirst()
        {
            await SeedAsync(
                StockImage.Create("shared/stock/1.webp", "Lahmacun", null, null),
                StockImage.Create("shared/stock/2.webp", "Kebap Tabağı", null, null),
                StockImage.Create(AdanaKey, "Adana", ["kebap", "acılı"], null));

            List<string> titles = await SearchTitlesAsync("Adana Kebap");

            Assert.Equal(new[] { "Adana", "Kebap Tabağı" }, titles);
        }

        [Fact]
        public async Task Results_AreCapped()
        {
            await SeedAsync(Enumerable.Range(0, StockImageSearch.MaxResults + 10)
                .Select(i => StockImage.Create($"shared/stock/cay-{i}.webp", $"Çay {i}", null, null))
                .ToArray());

            Assert.Equal(StockImageSearch.MaxResults, (await SearchTitlesAsync("cay")).Count);
            Assert.Equal(StockImageSearch.MaxResults, (await SearchTitlesAsync(null)).Count);
        }
    }

    public class ScopeTests : ApplicationTestBase
    {
        private async Task<List<string>> SearchTitlesAsync(string? q, StockImageScope scope, string? group = null)
        {
            var result = await new SearchStockImagesQueryHandler(Db, Options())
                .Handle(new SearchStockImagesQuery { Q = q, Scope = scope, Group = group }, CancellationToken.None);
            Assert.True(result.IsSuccess, result.Error);
            return result.Value!.Select(i => i.Title).ToList();
        }

        private async Task SeedMixedAsync()
        {
            DbContext.StockImages.AddRange(
                StockImage.Create("shared/stock/cay.webp", "Çay", ["sıcak içecek", "bahçe"], "Sıcak içecek", sortOrder: 0),
                StockImage.Create("shared/stock/adana.webp", "Adana", ["kebap"], "Kebap ve ızgara", sortOrder: 1),
                StockImage.Create("shared/stock/masa-sofra-1.webp", "Kurulu sofra", ["masa"], "Masa ve sofra", sortOrder: 0),
                StockImage.Create("shared/stock/teras-bahce-1.webp", "Bahçe masaları", ["bahçe", "açık hava"], "Teras ve bahçe", sortOrder: 5),
                StockImage.Create("shared/stock/kafe-1.webp", "Kafe köşesi", ["kahve"], "Kafe", sortOrder: 9),
                StockImage.Create("shared/stock/mekan-2.webp", "Akşam salonu", ["salon"], "Mekân", sortOrder: 2),
                StockImage.Create("shared/stock/mekan-1.webp", "Aydınlık salon", ["salon"], "Mekân", sortOrder: 1));
            await DbContext.SaveChangesAsync();
        }

        [Fact]
        public async Task DefaultScope_ReturnsEverything_AsBefore()
        {
            await SeedMixedAsync();

            Assert.Equal(7, (await SearchTitlesAsync(null, StockImageScope.All)).Count);
        }

        [Fact]
        public async Task VenueScope_EmptyQuery_ReturnsVenueGroupsOnly_ByGroupOrderThenSortOrder()
        {
            await SeedMixedAsync();

            Assert.Equal(
                new[] { "Aydınlık salon", "Akşam salonu", "Kafe köşesi", "Bahçe masaları", "Kurulu sofra" },
                await SearchTitlesAsync("  ", StockImageScope.Venue));
        }

        [Fact]
        public async Task VenueScope_EmptyQuery_NoVenueRows_ReturnsEmpty()
        {
            DbContext.StockImages.Add(StockImage.Create("shared/stock/cay.webp", "Çay", null, "Sıcak içecek"));
            await DbContext.SaveChangesAsync();

            Assert.Empty(await SearchTitlesAsync(null, StockImageScope.Venue));
        }

        [Fact]
        public async Task VenueScope_WithQuery_RanksVenueMatchesFirst_ThenTheRest()
        {
            await SeedMixedAsync();

            // Hepsi kapsamında "Çay" (kelime birebir, SortOrder 0) önde olurdu; mekân kapsamında mekân eşleşmesi önce gelir.
            Assert.Equal(new[] { "Bahçe masaları", "Çay" }, await SearchTitlesAsync("bahçe", StockImageScope.Venue));
        }

        [Fact]
        public async Task VenueScope_WithQuery_IsCappedAtMaxResults()
        {
            DbContext.StockImages.AddRange(Enumerable.Range(0, 30)
                .Select(i => StockImage.Create($"shared/stock/mekan-{i}.webp", $"Salon {i}", null, "Mekân"))
                .Concat(Enumerable.Range(0, 30).Select(i => StockImage.Create($"shared/stock/s-{i}.webp", $"Salon tabağı {i}", null, "Ana yemek")))
                .ToArray());
            await DbContext.SaveChangesAsync();

            List<string> titles = await SearchTitlesAsync("salon", StockImageScope.Venue);

            Assert.Equal(StockImageSearch.MaxResults, titles.Count);
            Assert.All(titles.Take(30), t => Assert.DoesNotContain("tabağı", t));
        }

        [Fact]
        public async Task FoodScope_ExcludesVenueGroups_WithAndWithoutQuery()
        {
            await SeedMixedAsync();

            Assert.Equal(new[] { "Çay", "Adana" }, await SearchTitlesAsync(null, StockImageScope.Food));
            Assert.Equal(new[] { "Çay" }, await SearchTitlesAsync("bahce", StockImageScope.Food));
        }

        [Fact]
        public async Task GroupFilter_IsTurkishInsensitive_AndCombinesWithScope()
        {
            await SeedMixedAsync();

            Assert.Equal(new[] { "Aydınlık salon", "Akşam salonu" }, await SearchTitlesAsync(null, StockImageScope.Venue, "mekan"));
            Assert.Empty(await SearchTitlesAsync(null, StockImageScope.Food, "Kafe"));
        }
    }

    public class SetProductStockImageTests : ApplicationTestBase
    {
        private async Task<(Product Product, StockImage Image)> SeedAsync(string currentKey, Guid? categoryBranchId = null)
        {
            Category category = Category.Create("Ana yemek", categoryBranchId ?? CurrentUser.BranchId);
            DbContext.Categories.Add(category);
            Product product = Product.Create("Adana Kebap", 300m, currentKey, category.Id);
            DbContext.Products.Add(product);
            StockImage image = StockImage.Create(AdanaKey, "Adana", ["kebap"], "Ana yemek");
            DbContext.StockImages.Add(image);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();
            return (product, image);
        }

        private Task<RestaurantBill.Domain.Shared.Result<string>> SendAsync(FakeImageStorageService storage, Guid productId, Guid imageId)
            => new SetProductStockImageCommandHandler(Db, CurrentUser, storage, Options())
                .Handle(new SetProductStockImageCommand { ProductId = productId, StockImageId = imageId }, CancellationToken.None);

        [Fact]
        public async Task SetsSharedKey_WithoutUploadOrDelete_AndWritesAuditLog()
        {
            var (product, image) = await SeedAsync(currentKey: "");
            var storage = new FakeImageStorageService();

            var result = await SendAsync(storage, product.Id, image.Id);

            Assert.True(result.IsSuccess, result.Error);
            Assert.Equal("https://cdn.test/shared/stock/adana.webp", result.Value);
            Assert.Equal(AdanaKey, DbContext.Products.Single().ImageUrl);
            Assert.Empty(storage.UploadedKeys);
            Assert.Empty(storage.DeletedKeys);
            AuditLog log = Assert.Single(DbContext.AuditLogs.ToList());
            Assert.Equal("ProductStockImageSelected", log.Action);
        }

        [Fact]
        public async Task ReplacingOwnUploadedFile_DeletesIt_LikeUploadDoes()
        {
            var (product, image) = await SeedAsync(currentKey: OwnKey);
            var storage = new FakeImageStorageService();

            await SendAsync(storage, product.Id, image.Id);

            Assert.Equal(new[] { OwnKey }, storage.DeletedKeys);
        }

        [Fact]
        public async Task ReplacingAnotherStockImage_NeverDeletesTheSharedFile()
        {
            var (product, image) = await SeedAsync(currentKey: CayKey);
            var storage = new FakeImageStorageService();

            await SendAsync(storage, product.Id, image.Id);

            Assert.Equal(AdanaKey, DbContext.Products.Single().ImageUrl);
            Assert.Empty(storage.DeletedKeys);
        }

        [Fact]
        public async Task ProductOfAnotherBranch_Fails()
        {
            var (product, image) = await SeedAsync(currentKey: "", categoryBranchId: Guid.NewGuid());

            var result = await SendAsync(new FakeImageStorageService(), product.Id, image.Id);

            Assert.True(result.IsFailure);
            Assert.Equal(string.Empty, DbContext.Products.Single().ImageUrl);
        }

        [Fact]
        public async Task UnknownOrInactiveStockImage_Fails()
        {
            var (product, image) = await SeedAsync(currentKey: OwnKey);
            image.Update(image.Title, image.GetKeywords(), image.Group, image.SortOrder, isActive: false);
            await DbContext.SaveChangesAsync();
            var storage = new FakeImageStorageService();

            Assert.True((await SendAsync(storage, product.Id, image.Id)).IsFailure);
            Assert.True((await SendAsync(storage, product.Id, Guid.NewGuid())).IsFailure);
            Assert.Equal(OwnKey, DbContext.Products.Single().ImageUrl);
            Assert.Empty(storage.DeletedKeys);
        }
    }

    public class SetSetMenuStockImageTests : ApplicationTestBase
    {
        private async Task<(SetMenu Menu, StockImage Image)> SeedAsync(string currentKey, Guid? branchId = null)
        {
            SetMenu menu = SetMenu.Create(branchId ?? CurrentUser.BranchId, "Adana Menü");
            if (currentKey.Length > 0) menu.UpdateImage(currentKey);
            DbContext.SetMenus.Add(menu);
            StockImage image = StockImage.Create(AdanaKey, "Adana", ["kebap"], "Ana yemek");
            DbContext.StockImages.Add(image);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();
            return (menu, image);
        }

        private Task<RestaurantBill.Domain.Shared.Result<string>> SendAsync(FakeImageStorageService storage, Guid menuId, Guid imageId)
            => new SetSetMenuStockImageCommandHandler(Db, CurrentUser, storage, Options())
                .Handle(new SetSetMenuStockImageCommand { SetMenuId = menuId, StockImageId = imageId }, CancellationToken.None);

        [Fact]
        public async Task SetsSharedKey_WithoutUpload_AndWritesAuditLog()
        {
            var (menu, image) = await SeedAsync(currentKey: "");
            var storage = new FakeImageStorageService();

            var result = await SendAsync(storage, menu.Id, image.Id);

            Assert.True(result.IsSuccess, result.Error);
            Assert.Equal("https://cdn.test/shared/stock/adana.webp", result.Value);
            Assert.Equal(AdanaKey, DbContext.SetMenus.Single().ImageUrl);
            Assert.Empty(storage.UploadedKeys);
            Assert.Empty(storage.DeletedKeys);
            Assert.Equal("SetMenuStockImageSelected", Assert.Single(DbContext.AuditLogs.ToList()).Action);
        }

        [Fact]
        public async Task ReplacingOwnFile_DeletesIt_ButReplacingStock_DoesNot()
        {
            var (menu, image) = await SeedAsync(currentKey: OwnKey);
            var storage = new FakeImageStorageService();
            await SendAsync(storage, menu.Id, image.Id);
            Assert.Equal(new[] { OwnKey }, storage.DeletedKeys);

            StockImage cay = StockImage.Create(CayKey, "Çay", null, null);
            DbContext.StockImages.Add(cay);
            await DbContext.SaveChangesAsync();
            await SendAsync(storage, menu.Id, cay.Id);

            Assert.Equal(CayKey, DbContext.SetMenus.Single().ImageUrl);
            Assert.Equal(new[] { OwnKey }, storage.DeletedKeys);
        }

        [Fact]
        public async Task MenuOfAnotherBranch_Fails()
        {
            var (menu, image) = await SeedAsync(currentKey: "", branchId: Guid.NewGuid());

            Assert.True((await SendAsync(new FakeImageStorageService(), menu.Id, image.Id)).IsFailure);
        }
    }

    // Paylaşılan dosya hiçbir değiştirme/silme yolunda silinmez: aynı "Adana" fotoğrafını başka restoranlar da kullanıyor.
    public class SharedKeyProtectionTests : ApplicationTestBase
    {
        private async Task<Product> SeedProductAsync(string key)
        {
            Category category = Category.Create("Ana yemek", CurrentUser.BranchId);
            DbContext.Categories.Add(category);
            Product product = Product.Create("Adana Kebap", 300m, key, category.Id);
            DbContext.Products.Add(product);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();
            return product;
        }

        private async Task<SetMenu> SeedMenuAsync(string key)
        {
            SetMenu menu = SetMenu.Create(CurrentUser.BranchId, "Adana Menü");
            menu.UpdateImage(key);
            DbContext.SetMenus.Add(menu);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();
            return menu;
        }

        [Fact]
        public async Task UploadingOwnProductImage_OverStockImage_DoesNotDeleteSharedFile()
        {
            Product product = await SeedProductAsync(AdanaKey);
            var storage = new FakeImageStorageService { NextKey = "products/new.webp" };

            var result = await new UploadProductImageCommandHandler(Db, CurrentUser, storage, Options()).Handle(new UploadProductImageCommand
            {
                ProductId = product.Id, Content = new MemoryStream([1, 2, 3]), ContentType = "image/png", Length = 3
            }, CancellationToken.None);

            Assert.True(result.IsSuccess, result.Error);
            Assert.Equal("products/new.webp", DbContext.Products.Single().ImageUrl);
            Assert.Empty(storage.DeletedKeys);
        }

        [Fact]
        public async Task DeletingProductWithStockImage_DoesNotDeleteSharedFile()
        {
            Product product = await SeedProductAsync(AdanaKey);
            var storage = new FakeImageStorageService();

            var result = await new DeleteProductCommandHandler(Db, CurrentUser, storage).Handle(new DeleteProductCommand { Id = product.Id }, CancellationToken.None);

            Assert.True(result.IsSuccess, result.Error);
            Assert.Empty(DbContext.Products.ToList());
            Assert.Empty(storage.DeletedKeys);
        }

        [Fact]
        public async Task UploadingOwnSetMenuImage_OverStockImage_DoesNotDeleteSharedFile()
        {
            SetMenu menu = await SeedMenuAsync(AdanaKey);
            var storage = new FakeImageStorageService { NextKey = "products/new.webp" };

            var result = await new UploadSetMenuImageCommandHandler(Db, CurrentUser, storage, Options()).Handle(new UploadSetMenuImageCommand
            {
                SetMenuId = menu.Id, Content = new MemoryStream([1, 2, 3]), ContentType = "image/png", Length = 3
            }, CancellationToken.None);

            Assert.True(result.IsSuccess, result.Error);
            Assert.Equal("products/new.webp", DbContext.SetMenus.Single().ImageUrl);
            Assert.Empty(storage.DeletedKeys);
        }

        [Fact]
        public async Task DeletingSetMenuWithStockImage_DoesNotDeleteSharedFile()
        {
            SetMenu menu = await SeedMenuAsync(AdanaKey);
            var storage = new FakeImageStorageService();

            var result = await new DeleteSetMenuCommandHandler(Db, CurrentUser, storage).Handle(new DeleteSetMenuCommand { Id = menu.Id }, CancellationToken.None);

            Assert.True(result.IsSuccess, result.Error);
            Assert.Empty(DbContext.SetMenus.ToList());
            Assert.Empty(storage.DeletedKeys);
        }

        [Fact]
        public async Task DeletingSetMenuWithOwnImage_StillDeletesItsFile()
        {
            SetMenu menu = await SeedMenuAsync(OwnKey);
            var storage = new FakeImageStorageService();

            await new DeleteSetMenuCommandHandler(Db, CurrentUser, storage).Handle(new DeleteSetMenuCommand { Id = menu.Id }, CancellationToken.None);

            Assert.Equal(new[] { OwnKey }, storage.DeletedKeys);
        }

        [Fact]
        public async Task Helper_SkipsSharedAndEmptyKeys()
        {
            var storage = new FakeImageStorageService();

            await storage.DeleteReplacedImageAsync(AdanaKey, CancellationToken.None);
            await storage.DeleteReplacedImageAsync("/shared/stock/x.webp", CancellationToken.None);
            await storage.DeleteReplacedImageAsync("", CancellationToken.None);
            await storage.DeleteReplacedImageAsync(OwnKey, CancellationToken.None);

            Assert.Equal(new[] { OwnKey }, storage.DeletedKeys);
        }
    }
}
