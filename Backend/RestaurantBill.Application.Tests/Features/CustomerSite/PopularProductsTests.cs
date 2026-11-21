using Microsoft.Extensions.Caching.Memory;
using RestaurantBill.Application.Features.CustomerSite.Public;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.CustomerSite;

// Masa QR menüsünün "Popüler" bölümü: son 30 günün ödeme kalemlerinden en çok satan ürünler.
public class PopularProductsTests : ApplicationTestBase
{
    private const string Slug = "populer-restoran";
    private static readonly DateTime Now = new(2026, 11, 20, 12, 0, 0, DateTimeKind.Utc);

    private readonly FakeTenantResolver _tenant = new() { Slug = Slug };
    private readonly MemoryCache _cache = new(new MemoryCacheOptions());
    private CashRegister _register = default!;

    private sealed class FixedClock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(Now);
    }

    private static void Set<T>(BaseEntity entity, string property, T value)
        => typeof(BaseEntity).GetProperty(property)!.SetValue(entity, value);

    private async Task<(Branch Branch, Table Table)> SeedAsync(QrFeatures? features)
    {
        User owner = await SeedActorAsync("Yönetici");
        Company company = Company.Create("Popüler Restoran", owner);
        company.Slug = Slug;
        DbContext.Companies.Add(company);
        Branch branch = Branch.Create(company.Id, "Merkez", "", "", "", "İstanbul", "Fatih", "", 10m);
        Set(branch, nameof(BaseEntity.Id), CurrentUser.BranchId);
        branch.SetQrFeatures(features);
        DbContext.Branches.Add(branch);
        _register = CashRegister.Create("Kasa", 0m, CurrentUser.BranchId);
        DbContext.CashRegisters.Add(_register);
        await DbContext.SaveChangesAsync();
        return (branch, await SeedTableAsync());
    }

    private async Task<Product> ProductAsync(string name, Guid? categoryId = null)
    {
        Product product = Product.Create(name, 100m, "", categoryId ?? await DefaultCategoryIdAsync());
        DbContext.Products.Add(product);
        await DbContext.SaveChangesAsync();
        return product;
    }

    private async Task SellAsync(Product product, int quantity, int daysAgo = 1, CashRegister? register = null)
    {
        Payment payment = Payment.Create(Guid.NewGuid(), (register ?? _register).Id, 100m * quantity, 100m * quantity, 0m, PaymentMethod.Nakit, quantity);
        DbContext.Payments.Add(payment);
        DbContext.PaymentLineItems.Add(PaymentLineItem.Create(payment, product.Id, product.Name, product.CategoryId, "Kategori", 100m, quantity, 0m));
        await DbContext.SaveChangesAsync();
        // Kayıt anı SaveChanges'te yazılır; ödemenin tarihi sonradan geri alınır.
        Set(payment, nameof(BaseEntity.CreatedAt), Now.AddDays(-daysAgo));
        await DbContext.SaveChangesAsync();
    }

    private Task<List<Guid>> ComputeAsync() => PopularProducts.ComputeAsync(Db, CurrentUser.BranchId, Now, CancellationToken.None);

    [Fact]
    public async Task RanksByQuantitySold_TieBrokenByName_AtMostEight()
    {
        await SeedAsync(null);
        List<Product> products = [];
        for (int i = 0; i < 10; i++) products.Add(await ProductAsync($"Ürün {i}"));
        for (int i = 0; i < 10; i++) await SellAsync(products[i], quantity: 10 - i);
        Product tie = await ProductAsync("Ayran");
        await SellAsync(tie, quantity: 9);   // "Ürün 1" ile berabere: ad sırası öne alır
        await SellAsync(products[9], quantity: 20, daysAgo: 3); // iki ödemenin toplamı: 21

        List<Guid> ids = await ComputeAsync();

        Assert.Equal(PopularProducts.MaxProducts, ids.Count);
        Assert.Equal(products[9].Id, ids[0]);
        Assert.Equal(products[0].Id, ids[1]);
        Assert.Equal(tie.Id, ids[2]);
        Assert.Equal(products[1].Id, ids[3]);
    }

    [Fact]
    public async Task IgnoresSalesOlderThanThirtyDays_OtherBranches_InactiveAndSoldOut()
    {
        await SeedAsync(null);
        Product a = await ProductAsync("A"), b = await ProductAsync("B"), c = await ProductAsync("C");
        Product old = await ProductAsync("Eski"), soldOut = await ProductAsync("Tükendi"), passive = await ProductAsync("Pasif");
        await SellAsync(a, 3); await SellAsync(b, 2); await SellAsync(c, 1);
        await SellAsync(old, 50, daysAgo: 31);
        await SellAsync(soldOut, 50); soldOut.SetOutOfStock(true);
        await SellAsync(passive, 50); passive.Update(passive.Name, passive.Price, isActive: false, passive.CategoryId);
        await DbContext.SaveChangesAsync();
        // Başka şubenin kasasından satış (aynı ürün kimliğiyle bile) sayılmaz.
        CashRegister otherRegister = CashRegister.Create("Diğer", 0m, Guid.NewGuid());
        DbContext.CashRegisters.Add(otherRegister);
        await DbContext.SaveChangesAsync();
        await SellAsync(c, 100, register: otherRegister);

        Assert.Equal([a.Id, b.Id, c.Id], await ComputeAsync());
    }

    [Fact]
    public async Task FewerThanThreeProductsWithSales_IsEmpty()
    {
        await SeedAsync(null);
        Product a = await ProductAsync("A"), b = await ProductAsync("B");
        await SellAsync(a, 5); await SellAsync(b, 5);

        Assert.Empty(await ComputeAsync());
    }

    private async Task<List<Guid>> TableAsync(Guid tableId)
    {
        var result = await new GetPublicTableQueryHandler(Db, _tenant, _cache, new FixedClock())
            .Handle(new GetPublicTableQuery { TableId = tableId }, CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);
        return result.Value!.PopularProductIds;
    }

    private async Task SeedThreeSoldAsync()
    {
        foreach (string name in new[] { "A", "B", "C" }) await SellAsync(await ProductAsync(name), 2);
    }

    [Fact]
    public async Task PublicTable_SectionOffByDefault_ReturnsNoPopularProducts()
    {
        var (_, table) = await SeedAsync(null);
        await SeedThreeSoldAsync();

        Assert.Empty(await TableAsync(table.Id));
    }

    [Fact]
    public async Task PublicTable_SectionOn_ReturnsPopularProducts_Cached()
    {
        var (_, table) = await SeedAsync(QrFeatures.Create(true, true, true, true, true, featuredSectionEnabled: true, popularSectionEnabled: true));
        await SeedThreeSoldAsync();

        List<Guid> first = await TableAsync(table.Id);
        Assert.Equal(3, first.Count);

        // Önbellek süresi içinde yeni satış listeyi değiştirmez.
        Product d = await ProductAsync("D");
        await SellAsync(d, 100);
        Assert.Equal(first, await TableAsync(table.Id));
    }
}
