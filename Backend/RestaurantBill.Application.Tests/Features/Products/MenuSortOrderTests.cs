using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Categories.Commands.CreateCategory;
using RestaurantBill.Application.Features.Categories.Commands.ReorderCategories;
using RestaurantBill.Application.Features.Categories.Queries.GetAllCategories;
using RestaurantBill.Application.Features.Products.Commands.CreateProduct;
using RestaurantBill.Application.Features.Products.Commands.ReorderProducts;
using RestaurantBill.Application.Features.Products.Commands.UpdateProduct;
using RestaurantBill.Application.Features.Products.Queries.GetAllProduct;
using RestaurantBill.Application.Features.SetMenus;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Tests.Features.Products;

// Menü sırası yöneticide: yeni ürün/kategori/menü sona eklenir, sonra sürükle-bırakla yeri değiştirilir.
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

    private async Task<Category> AddCategoryAsync(string name, Guid? branchId = null)
    {
        Category category = Category.Create(name, branchId ?? CurrentUser.BranchId);
        DbContext.Categories.Add(category);
        await DbContext.SaveChangesAsync();
        return category;
    }

    [Fact]
    public async Task NewProduct_GoesToEndOfItsCategory()
    {
        await SeedActorAsync();
        Guid categoryId = await DefaultCategoryIdAsync();

        await CreateProductAsync("Kola", categoryId);
        await CreateProductAsync("Ayran", categoryId);
        await CreateProductAsync("Çay", categoryId);

        Assert.Equal(["Kola", "Ayran", "Çay"], ProductNamesInOrder(categoryId));
    }

    [Fact]
    public async Task Reorder_SetsProductOrder()
    {
        await SeedActorAsync();
        Guid categoryId = await DefaultCategoryIdAsync();
        Product ayran = await CreateProductAsync("Ayran", categoryId);
        Product cay = await CreateProductAsync("Çay", categoryId);

        var result = await new ReorderProductsCommandHandler(Db, CurrentUser).Handle(
            new ReorderProductsCommand { CategoryId = categoryId, OrderedProductIds = [cay.Id, ayran.Id] }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(["Çay", "Ayran"], ProductNamesInOrder(categoryId));
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
        Assert.Equal(["Ayran", "Çay"], ProductNamesInOrder(categoryId));
    }

    [Fact]
    public async Task Reorder_WithProductFromAnotherCategory_Fails()
    {
        await SeedActorAsync();
        Guid categoryId = await DefaultCategoryIdAsync();
        Category desserts = await AddCategoryAsync("Tatlılar");
        Product ayran = await CreateProductAsync("Ayran", categoryId);
        Product baklava = await CreateProductAsync("Baklava", desserts.Id);

        var result = await new ReorderProductsCommandHandler(Db, CurrentUser).Handle(
            new ReorderProductsCommand { CategoryId = categoryId, OrderedProductIds = [baklava.Id] }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(0, ayran.SortOrder);
        Assert.Equal(0, baklava.SortOrder);
    }

    [Fact]
    public async Task Reorder_InAnotherBranchCategory_Fails()
    {
        await SeedActorAsync();
        Category foreign = await AddCategoryAsync("Başka şube", Guid.NewGuid());

        var result = await new ReorderProductsCommandHandler(Db, CurrentUser).Handle(
            new ReorderProductsCommand { CategoryId = foreign.Id, OrderedProductIds = [Guid.NewGuid()] }, CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task MovingProductToAnotherCategory_PutsItLastThere()
    {
        await SeedActorAsync();
        Category drinks = await SeedCategoryAsync();
        Category desserts = await AddCategoryAsync("Tatlılar");
        await CreateProductAsync("Baklava", desserts.Id);
        Product ayran = await CreateProductAsync("Ayran", drinks.Id);

        var result = await new UpdateProductCommandHandler(Db, CurrentUser).Handle(new UpdateProductCommand
        {
            Id = ayran.Id, Name = ayran.Name, Price = ayran.Price, IsActive = true, CategoryId = desserts.Id
        }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(["Baklava", "Ayran"], ProductNamesInOrder(desserts.Id));
    }

    [Fact]
    public async Task NewCategory_GoesLast_AndCanBeReordered()
    {
        await SeedActorAsync();
        var create = new CreateCategoryCommandHandler(Db, CurrentUser);
        await create.Handle(new CreateCategoryCommand { Name = "Tatlılar" }, CancellationToken.None);
        await create.Handle(new CreateCategoryCommand { Name = "Çorbalar" }, CancellationToken.None);

        List<Category> ordered = DbContext.Categories.OrderBy(c => c.SortOrder).ToList();
        Assert.Equal(["Tatlılar", "Çorbalar"], ordered.Select(c => c.Name));

        var result = await new ReorderCategoriesCommandHandler(Db, CurrentUser).Handle(
            new ReorderCategoriesCommand { OrderedCategoryIds = [ordered[1].Id, ordered[0].Id] }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(["Çorbalar", "Tatlılar"], DbContext.Categories.OrderBy(c => c.SortOrder).Select(c => c.Name));
    }

    [Fact]
    public async Task ReorderCategories_WithAnotherBranchCategory_FailsAndKeepsOrder()
    {
        await SeedActorAsync();
        Category soups = await AddCategoryAsync("Çorbalar");
        Category foreign = await AddCategoryAsync("Başka şube", Guid.NewGuid());

        var result = await new ReorderCategoriesCommandHandler(Db, CurrentUser).Handle(
            new ReorderCategoriesCommand { OrderedCategoryIds = [foreign.Id, soups.Id] }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(0, soups.SortOrder);
        Assert.Equal(0, foreign.SortOrder);
    }

    [Fact]
    public async Task Queries_ReturnCategoriesAndProductsInSortOrder()
    {
        await SeedActorAsync();
        // Kategori sorgusu şubenin KDV oranını da okur: şube kaydı gerekir.
        Branch branch = Branch.Create(CurrentUser.CompanyId, "Merkez Şube", "Yönetici", "111", "b@mail.com", "İstanbul", "Kadıköy", "Adres", 0);
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(branch, CurrentUser.BranchId);
        DbContext.Branches.Add(branch);
        Category drinks = await AddCategoryAsync("İçecekler");
        Category soups = await AddCategoryAsync("Çorbalar");
        drinks.SetSortOrder(1);
        soups.SetSortOrder(0);
        Product kola = await CreateProductAsync("Kola", drinks.Id);
        Product ayran = await CreateProductAsync("Ayran", drinks.Id);
        await CreateProductAsync("Mercimek", soups.Id);
        kola.SetSortOrder(5);
        ayran.SetSortOrder(1);
        await DbContext.SaveChangesAsync();

        var categories = await new GetAllCategoryQueryHandler(Db, CurrentUser).Handle(new GetAllCategoryQuery(), CancellationToken.None);
        var products = await new GetAllProductQueryHandler(Db, CurrentUser, Options.Create(new BunnyStorageOptions())).Handle(new GetAllProductQuery(), CancellationToken.None);

        Assert.Equal(["Çorbalar", "İçecekler"], categories.Value!.Select(c => c.Name));
        Assert.Equal(["Mercimek", "Ayran", "Kola"], products.Value!.Select(p => p.Name));
    }

    private SetMenu AddSetMenu(string name, Guid branchId)
    {
        SetMenu menu = SetMenu.Create(branchId, name);
        DbContext.SetMenus.Add(menu);
        return menu;
    }

    [Fact]
    public async Task ReorderSetMenus_SetsOrder_AndRejectsForeignOrPartialLists()
    {
        await SeedActorAsync();
        SetMenu adana = AddSetMenu("Adana Menü", CurrentUser.BranchId);
        SetMenu urfa = AddSetMenu("Urfa Menü", CurrentUser.BranchId);
        SetMenu foreign = AddSetMenu("Başka Menü", Guid.NewGuid());
        await DbContext.SaveChangesAsync();
        var handler = new ReorderSetMenusCommandHandler(Db, CurrentUser);

        var partial = await handler.Handle(new ReorderSetMenusCommand { OrderedSetMenuIds = [urfa.Id] }, CancellationToken.None);
        var withForeign = await handler.Handle(new ReorderSetMenusCommand { OrderedSetMenuIds = [urfa.Id, foreign.Id] }, CancellationToken.None);
        Assert.False(partial.IsSuccess);
        Assert.False(withForeign.IsSuccess);

        var ok = await handler.Handle(new ReorderSetMenusCommand { OrderedSetMenuIds = [urfa.Id, adana.Id] }, CancellationToken.None);
        Assert.True(ok.IsSuccess, ok.Error);
        Assert.Equal(0, urfa.SortOrder);
        Assert.Equal(1, adana.SortOrder);
        Assert.Equal(0, foreign.SortOrder);
    }
}
