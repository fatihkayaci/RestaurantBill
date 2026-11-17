using RestaurantBill.Application.Features.Categories.Commands.CreateCategory;
using RestaurantBill.Application.Features.Categories.Commands.ReorderCategories;
using RestaurantBill.Application.Features.Products.Commands.CreateProduct;
using RestaurantBill.Application.Features.Products.Commands.ReorderProducts;
using RestaurantBill.Application.Features.Products.Commands.UpdateProduct;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Tests.Features.Products;

// Menü sırası yöneticide: yeni ürün/kategori en başa gelir, sonra yeri değiştirilebilir.
public class MenuSortOrderTests : ApplicationTestBase
{
    private async Task<Product> CreateProductAsync(string name, Guid categoryId)
    {
        var result = await new CreateProductCommandHandler(Db, CurrentUser).Handle(
            new CreateProductCommand { Name = name, Price = 10m, IsActive = true, CategoryId = categoryId }, CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);
        return DbContext.Products.Single(p => p.Name == name);
    }

    private List<string> ProductNamesInOrder(Guid categoryId) => DbContext.Products
        .Where(p => p.CategoryId == categoryId).OrderBy(p => p.SortOrder).Select(p => p.Name).ToList();

    [Fact]
    public async Task NewProduct_GoesToTopOfItsCategory()
    {
        await SeedActorAsync();
        Guid categoryId = await DefaultCategoryIdAsync();

        await CreateProductAsync("Ayran", categoryId);
        await CreateProductAsync("Çay", categoryId);
        await CreateProductAsync("Kola", categoryId);

        Assert.Equal(["Kola", "Çay", "Ayran"], ProductNamesInOrder(categoryId));
    }

    [Fact]
    public async Task Reorder_SetsProductOrder()
    {
        await SeedActorAsync();
        Guid categoryId = await DefaultCategoryIdAsync();
        Product ayran = await CreateProductAsync("Ayran", categoryId);
        Product cay = await CreateProductAsync("Çay", categoryId);

        var result = await new ReorderProductsCommandHandler(Db, CurrentUser).Handle(
            new ReorderProductsCommand { CategoryId = categoryId, OrderedProductIds = [ayran.Id, cay.Id] }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(["Ayran", "Çay"], ProductNamesInOrder(categoryId));
    }

    [Fact]
    public async Task Reorder_WithMissingProduct_FailsAndKeepsOrder()
    {
        await SeedActorAsync();
        Guid categoryId = await DefaultCategoryIdAsync();
        Product ayran = await CreateProductAsync("Ayran", categoryId);
        await CreateProductAsync("Çay", categoryId);

        var result = await new ReorderProductsCommandHandler(Db, CurrentUser).Handle(
            new ReorderProductsCommand { CategoryId = categoryId, OrderedProductIds = [ayran.Id] }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(["Çay", "Ayran"], ProductNamesInOrder(categoryId));
    }

    [Fact]
    public async Task MovingProductToAnotherCategory_PutsItFirstThere()
    {
        await SeedActorAsync();
        Category drinks = await SeedCategoryAsync();
        Category desserts = Category.Create("Tatlılar", CurrentUser.BranchId);
        DbContext.Categories.Add(desserts);
        await DbContext.SaveChangesAsync();
        await CreateProductAsync("Baklava", desserts.Id);
        Product ayran = await CreateProductAsync("Ayran", drinks.Id);

        var result = await new UpdateProductCommandHandler(Db, CurrentUser).Handle(new UpdateProductCommand
        {
            Id = ayran.Id, Name = ayran.Name, Price = ayran.Price, IsActive = true, CategoryId = desserts.Id
        }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(["Ayran", "Baklava"], ProductNamesInOrder(desserts.Id));
    }

    [Fact]
    public async Task NewCategory_GoesFirst_AndCanBeReordered()
    {
        await SeedActorAsync();
        var create = new CreateCategoryCommandHandler(Db, CurrentUser);
        await create.Handle(new CreateCategoryCommand { Name = "Çorbalar" }, CancellationToken.None);
        await create.Handle(new CreateCategoryCommand { Name = "Tatlılar" }, CancellationToken.None);

        List<Category> ordered = DbContext.Categories.OrderBy(c => c.SortOrder).ToList();
        Assert.Equal(["Tatlılar", "Çorbalar"], ordered.Select(c => c.Name));

        var result = await new ReorderCategoriesCommandHandler(Db, CurrentUser).Handle(
            new ReorderCategoriesCommand { OrderedCategoryIds = [ordered[1].Id, ordered[0].Id] }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(["Çorbalar", "Tatlılar"], DbContext.Categories.OrderBy(c => c.SortOrder).Select(c => c.Name));
    }
}
