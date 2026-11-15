using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Integration.Tests.Infrastructure;
using RestaurantBill.Persistence.Context;
using RestaurantBill.Persistence.Seeds;

namespace RestaurantBill.Integration.Tests.Features.Seeds;

public class StockImageSeedTests
{
    private static RestaurantBillDbContext NewContext(string name) =>
        new(new DbContextOptionsBuilder<RestaurantBillDbContext>().UseInMemoryDatabase(name).Options, new FakeCurrentUserService());

    private const string Json = """
        // yorum satırı desteklenir
        [
          { "storageKey": "shared/stock/adana.webp", "title": "Adana", "keywords": ["kebap", "Acılı"], "group": "Ana yemek", "sortOrder": 1 },
          { "storageKey": "shared/stock/cay.webp", "title": "Çay", "keywords": ["sıcak içecek"], "group": "İçecek" },
        ]
        """;

    [Fact]
    public async Task EmbeddedSeedFile_LoadsWithoutErrors()
    {
        await using var context = NewContext(Guid.NewGuid().ToString());

        var result = await StockImageSeed.SeedFromEmbeddedFileAsync(context);

        Assert.Empty(result.Errors);
    }

    [Fact]
    public async Task Seed_AddsRows_AndIsIdempotentByStorageKey()
    {
        string db = Guid.NewGuid().ToString();
        await using (var context = NewContext(db))
        {
            var first = await StockImageSeed.SeedAsync(context, Json);
            Assert.Equal((2, 0), (first.Added, first.Updated));
            Assert.Empty(first.Errors);
        }

        await using (var context = NewContext(db))
        {
            var second = await StockImageSeed.SeedAsync(context, Json);
            Assert.Equal((0, 0), (second.Added, second.Updated));

            StockImage adana = await context.StockImages.SingleAsync(s => s.StorageKey == "shared/stock/adana.webp");
            Assert.Equal(new[] { "kebap", "acılı" }, adana.GetKeywords());
            Assert.Equal(2, await context.StockImages.CountAsync());
        }
    }

    [Fact]
    public async Task Seed_UpdatesChangedRows_AndCanDeactivate()
    {
        string db = Guid.NewGuid().ToString();
        await using (var context = NewContext(db))
            await StockImageSeed.SeedAsync(context, Json);

        await using (var context = NewContext(db))
        {
            var result = await StockImageSeed.SeedAsync(context, """
                [ { "storageKey": "shared/stock/cay.webp", "title": "Demlik Çay", "keywords": ["çay"], "isActive": false } ]
                """);

            Assert.Equal((0, 1), (result.Added, result.Updated));
            StockImage cay = await context.StockImages.SingleAsync(s => s.StorageKey == "shared/stock/cay.webp");
            Assert.Equal("Demlik Çay", cay.Title);
            Assert.False(cay.IsActive);
            // Dosyadan çıkan satır silinmez.
            Assert.Equal(2, await context.StockImages.CountAsync());
        }
    }

    [Fact]
    public async Task Seed_SkipsInvalidRows_AndKeepsValidOnes()
    {
        await using var context = NewContext(Guid.NewGuid().ToString());

        var result = await StockImageSeed.SeedAsync(context, """
            [
              { "storageKey": "products/x/adana.webp", "title": "Yanlış klasör" },
              { "storageKey": "shared/stock/ok.webp", "title": "" },
              { "storageKey": "shared/stock/lahmacun.webp", "title": "Lahmacun" },
              { "storageKey": "shared/stock/lahmacun.webp", "title": "Tekrar" }
            ]
            """);

        Assert.Equal(1, result.Added);
        Assert.Equal(3, result.Errors.Count);
        Assert.Equal("Lahmacun", (await context.StockImages.SingleAsync()).Title);
    }

    [Fact]
    public async Task Seed_WithBrokenJson_ReportsErrorWithoutThrowing()
    {
        await using var context = NewContext(Guid.NewGuid().ToString());

        var result = await StockImageSeed.SeedAsync(context, "[ { ");

        Assert.Single(result.Errors);
        Assert.Empty(context.StockImages);
    }
}
