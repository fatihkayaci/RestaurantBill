using RestaurantBill.Application.Features.Products.Queries.GetAllProduct;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Integration.Tests.Infrastructure;

namespace RestaurantBill.Integration.Tests.Features.Products;

public class GetAllProductsQueryTests : IntegrationTestBase
{
    private readonly GetAllProductQueryHandler _handler;

    public GetAllProductsQueryTests()
    {
        _handler = new GetAllProductQueryHandler(UnitOfWork, CurrentUser);
    }

    [Fact]
    public async Task Handle_WhenNoProductsExist_ReturnsEmptyList()
    {
        var result = await _handler.Handle(new GetAllProductQuery(), CancellationToken.None);

        Assert.Empty(result);
    }

    [Fact]
    public async Task Handle_ReturnsOnlyProductsForCurrentRestaurant()
    {
        var myCategory = Category.Create("Icecekler", RestaurantId);
        var otherCategory = Category.Create("Icecekler", OtherRestaurantId);
        await DbContext.Categories.AddRangeAsync(myCategory, otherCategory);
        await DbContext.SaveChangesAsync();

        await DbContext.Products.AddRangeAsync(
            Product.Create("Cay", 10m, true, "", myCategory.Id),
            Product.Create("Kahve", 20m, true, "", otherCategory.Id)
        );
        await DbContext.SaveChangesAsync();

        var result = await _handler.Handle(new GetAllProductQuery(), CancellationToken.None);

        Assert.Single(result);
        Assert.Equal("Cay", result[0].Name);
    }

    [Fact]
    public async Task Handle_ReturnsProductsOrderedByName()
    {
        var category = Category.Create("Ana Yemekler", RestaurantId);
        await DbContext.Categories.AddAsync(category);
        await DbContext.SaveChangesAsync();

        await DbContext.Products.AddRangeAsync(
            Product.Create("C Urun", 30m, true, "", category.Id),
            Product.Create("A Urun", 10m, true, "", category.Id),
            Product.Create("B Urun", 20m, true, "", category.Id)
        );
        await DbContext.SaveChangesAsync();

        var result = await _handler.Handle(new GetAllProductQuery(), CancellationToken.None);

        Assert.Equal(3, result.Count);
        Assert.Equal("A Urun", result[0].Name);
        Assert.Equal("B Urun", result[1].Name);
        Assert.Equal("C Urun", result[2].Name);
    }

    [Fact]
    public async Task Handle_IncludesCategoryNameInProductDto()
    {
        var category = Category.Create("Tatlilar", RestaurantId);
        await DbContext.Categories.AddAsync(category);
        await DbContext.SaveChangesAsync();

        await DbContext.Products.AddAsync(Product.Create("Baklava", 35m, true, "", category.Id));
        await DbContext.SaveChangesAsync();

        var result = await _handler.Handle(new GetAllProductQuery(), CancellationToken.None);

        Assert.Single(result);
        Assert.Equal("Tatlilar", result[0].CategoryName);
    }
}
