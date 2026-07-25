using RestaurantBill.Application.Features.Categories.Queries.GetAllCategories;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;
using RestaurantBill.Integration.Tests.Infrastructure;

namespace RestaurantBill.Integration.Tests.Features.Categories;

public class GetAllCategoriesQueryTests : IntegrationTestBase
{
    private readonly GetAllCategoryQueryHandler _handler;

    public GetAllCategoriesQueryTests()
    {
        _handler = new GetAllCategoryQueryHandler(UnitOfWork, CurrentUser);
    }

    [Fact]
    public async Task Handle_WhenNoCategoriesExist_ReturnsEmptyList()
    {
        var result = await _handler.Handle(new GetAllCategoryQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task Handle_ReturnsOnlyCategoriesForCurrentRestaurant()
    {
        await DbContext.Categories.AddRangeAsync(
            Category.Create("A Kategori", RestaurantId),
            Category.Create("B Kategori", OtherRestaurantId)
        );
        await DbContext.SaveChangesAsync();

        var result = await _handler.Handle(new GetAllCategoryQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Single(result.Value!);
        Assert.Equal("A Kategori", result.Value![0].Name);
    }

    [Fact]
    public async Task Handle_ReturnsCategoriesOrderedByName()
    {
        await DbContext.Categories.AddRangeAsync(
            Category.Create("C Kategori", RestaurantId),
            Category.Create("A Kategori", RestaurantId),
            Category.Create("B Kategori", RestaurantId)
        );
        await DbContext.SaveChangesAsync();

        var result = await _handler.Handle(new GetAllCategoryQuery(), CancellationToken.None);
        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Value!.Count);
        Assert.Equal("A Kategori", result.Value![0].Name);
        Assert.Equal("B Kategori", result.Value![1].Name);
        Assert.Equal("C Kategori", result.Value![2].Name);
    }
}
