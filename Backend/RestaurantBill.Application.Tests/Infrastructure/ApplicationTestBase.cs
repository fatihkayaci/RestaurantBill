using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Application.Tests.Infrastructure;

public abstract class ApplicationTestBase : IDisposable
{
    protected readonly RestaurantBillDbContext DbContext;
    protected readonly IAppDbContext Db;
    protected readonly FakeCurrentUserService CurrentUser;

    protected ApplicationTestBase()
    {
        var options = new DbContextOptionsBuilder<RestaurantBillDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        CurrentUser = new FakeCurrentUserService();
        DbContext = new RestaurantBillDbContext(options, CurrentUser);
        Db = DbContext;
    }

    protected async Task<User> SeedActorAsync(string fullName = "Test Kullanıcı", Guid? userId = null)
    {
        User user = User.Create(fullName, "test@test.com", "5551234567");
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(user, userId ?? CurrentUser.UserId);
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync();
        return user;
    }

    // Handler'lar Id ile gelen kayıtları kullanıcının şubesiyle sınırlar; test verisi bu yüzden
    // CurrentUser.BranchId'ye bağlı bir bölge/kategori üzerinden kurulmalı.
    protected async Task<Region> SeedRegionAsync(Guid? branchId = null)
    {
        Region region = Region.Create("Salon", branchId ?? CurrentUser.BranchId);
        DbContext.Regions.Add(region);
        await DbContext.SaveChangesAsync();
        return region;
    }

    protected async Task<Category> SeedCategoryAsync(Guid? branchId = null)
    {
        Category category = Category.Create("Kategori", branchId ?? CurrentUser.BranchId);
        DbContext.Categories.Add(category);
        await DbContext.SaveChangesAsync();
        return category;
    }

    private Region? _defaultRegion;
    private Category? _defaultCategory;

    protected async Task<Guid> DefaultRegionIdAsync()
        => (_defaultRegion ??= await SeedRegionAsync()).Id;

    protected async Task<Guid> DefaultCategoryIdAsync()
        => (_defaultCategory ??= await SeedCategoryAsync()).Id;

    protected async Task<Table> SeedTableAsync()
    {
        Table table = Table.Create("Masa", "", await DefaultRegionIdAsync());
        DbContext.Tables.Add(table);
        await DbContext.SaveChangesAsync();
        return table;
    }

    public void Dispose() => DbContext.Dispose();
}
