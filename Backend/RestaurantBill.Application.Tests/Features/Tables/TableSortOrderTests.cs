using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Regions.Commands.CreateRegion;
using RestaurantBill.Application.Features.Regions.Commands.ReorderRegions;
using RestaurantBill.Application.Features.Regions.Queries.GetAllRegions;
using RestaurantBill.Application.Features.Tables.Commands.BulkCreateTables;
using RestaurantBill.Application.Features.Tables.Commands.CreateTable;
using RestaurantBill.Application.Features.Tables.Commands.ReorderTables;
using RestaurantBill.Application.Features.Tables.Commands.UpdateTable;
using RestaurantBill.Application.Features.Tables.Queries.GetAllTable;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Tests.Features.Tables;

// Bölge ve masa sırası yöneticide: yeni kayıt sona eklenir, sürükle-bırakla yeri değişir; ekranlar bu sırayla listeler.
public class TableSortOrderTests : ApplicationTestBase
{
    private async Task<Region> AddRegionAsync(string name, Guid? branchId = null)
    {
        Region region = Region.Create(name, branchId ?? CurrentUser.BranchId);
        DbContext.Regions.Add(region);
        await DbContext.SaveChangesAsync();
        return region;
    }

    private async Task<Table> CreateTableAsync(string name, Guid regionId)
    {
        var result = await new CreateTableCommandHandler(Db, CurrentUser).Handle(
            new CreateTableCommand { Name = name, RegionId = regionId }, CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);
        return DbContext.Tables.Single(t => t.Name == name && t.RegionId == regionId);
    }

    private List<string> TableNamesInOrder(Guid regionId) => DbContext.Tables
        .Where(t => t.RegionId == regionId).OrderBy(t => t.SortOrder).Select(t => t.Name).ToList();

    private async Task<List<string>> ListedTableNamesAsync()
    {
        var result = await new GetAllTableQueryHandler(Db, CurrentUser).Handle(new GetAllTableQuery(), CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);
        return result.Value!.Select(t => t.Name).ToList();
    }

    [Fact]
    public async Task NewTables_GoToEndOfRegion_IncludingBulkCreated()
    {
        await SeedActorAsync();
        Region salon = await AddRegionAsync("Salon");
        await CreateTableAsync("Bar", salon.Id);

        var bulk = await new BulkCreateTablesCommandHandler(Db, CurrentUser).Handle(
            new BulkCreateTablesCommand { RegionId = salon.Id, Prefix = "Masa", StartNumber = 1, Count = 3 }, CancellationToken.None);
        Assert.True(bulk.IsSuccess, bulk.Error);
        await CreateTableAsync("Loca", salon.Id);

        Assert.Equal(["Bar", "Masa 1", "Masa 2", "Masa 3", "Loca"], TableNamesInOrder(salon.Id));
    }

    [Fact]
    public async Task ReorderTables_SetsOrder_AndListFollowsIt()
    {
        await SeedActorAsync();
        Region salon = await AddRegionAsync("Salon");
        Table a = await CreateTableAsync("Masa 1", salon.Id);
        Table b = await CreateTableAsync("Masa 2", salon.Id);
        Table c = await CreateTableAsync("Masa 3", salon.Id);

        var result = await new ReorderTablesCommandHandler(Db, CurrentUser).Handle(
            new ReorderTablesCommand { RegionId = salon.Id, OrderedTableIds = [c.Id, a.Id, b.Id] }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(["Masa 3", "Masa 1", "Masa 2"], await ListedTableNamesAsync());
    }

    [Fact]
    public async Task ReorderTables_WithMissingOrForeignTable_FailsAndKeepsOrder()
    {
        await SeedActorAsync();
        Region salon = await AddRegionAsync("Salon");
        Region garden = await AddRegionAsync("Bahçe");
        Table a = await CreateTableAsync("Masa 1", salon.Id);
        Table b = await CreateTableAsync("Masa 2", salon.Id);
        Table g = await CreateTableAsync("Bahçe 1", garden.Id);
        var handler = new ReorderTablesCommandHandler(Db, CurrentUser);

        var missing = await handler.Handle(
            new ReorderTablesCommand { RegionId = salon.Id, OrderedTableIds = [b.Id] }, CancellationToken.None);
        var otherRegion = await handler.Handle(
            new ReorderTablesCommand { RegionId = salon.Id, OrderedTableIds = [b.Id, g.Id] }, CancellationToken.None);

        Assert.False(missing.IsSuccess);
        Assert.False(otherRegion.IsSuccess);
        Assert.Equal(["Masa 1", "Masa 2"], TableNamesInOrder(salon.Id));
        Assert.Equal(0, a.SortOrder);
    }

    [Fact]
    public async Task ReorderTables_InAnotherBranchRegion_Fails()
    {
        await SeedActorAsync();
        Region foreign = await AddRegionAsync("Salon", Guid.NewGuid());
        Table t = Table.Create("Masa 1", "", foreign.Id);
        DbContext.Tables.Add(t);
        await DbContext.SaveChangesAsync();

        var result = await new ReorderTablesCommandHandler(Db, CurrentUser).Handle(
            new ReorderTablesCommand { RegionId = foreign.Id, OrderedTableIds = [t.Id] }, CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task MovingTableToAnotherRegion_PutsItLastThere()
    {
        await SeedActorAsync();
        Region salon = await AddRegionAsync("Salon");
        Region garden = await AddRegionAsync("Bahçe");
        await CreateTableAsync("Bahçe 1", garden.Id);
        Table moved = await CreateTableAsync("Masa 1", salon.Id);

        var result = await new UpdateCommandHandler(Db, CurrentUser).Handle(
            new UpdateTableCommand { Id = moved.Id, Name = moved.Name, RegionId = garden.Id }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(["Bahçe 1", "Masa 1"], TableNamesInOrder(garden.Id));
    }

    [Fact]
    public async Task TableList_OrdersByRegionThenTableOrderThenNaturalName()
    {
        await SeedActorAsync();
        Region salon = await AddRegionAsync("Salon");
        Region garden = await AddRegionAsync("Bahçe");
        salon.SetSortOrder(0);
        garden.SetSortOrder(1);
        // Aynı sırada (eski veri gibi) masalar doğal ad sırasıyla gelir.
        foreach (string name in new[] { "Masa 10", "Masa 2", "Masa 1" })
            DbContext.Tables.Add(Table.Create(name, "", salon.Id));
        DbContext.Tables.Add(Table.Create("Bahçe 1", "", garden.Id));
        await DbContext.SaveChangesAsync();

        Assert.Equal(["Masa 1", "Masa 2", "Masa 10", "Bahçe 1"], await ListedTableNamesAsync());

        var reorder = await new ReorderRegionsCommandHandler(Db, CurrentUser).Handle(
            new ReorderRegionsCommand { OrderedRegionIds = [garden.Id, salon.Id] }, CancellationToken.None);
        Assert.True(reorder.IsSuccess, reorder.Error);

        Assert.Equal(["Bahçe 1", "Masa 1", "Masa 2", "Masa 10"], await ListedTableNamesAsync());
    }

    [Fact]
    public async Task ReorderRegions_WithForeignOrMissingRegion_FailsAndKeepsOrder()
    {
        await SeedActorAsync();
        Region salon = await AddRegionAsync("Salon");
        Region garden = await AddRegionAsync("Bahçe");
        garden.SetSortOrder(1);
        Region foreign = await AddRegionAsync("Teras", Guid.NewGuid());
        var handler = new ReorderRegionsCommandHandler(Db, CurrentUser);

        var partial = await handler.Handle(new ReorderRegionsCommand { OrderedRegionIds = [garden.Id] }, CancellationToken.None);
        var withForeign = await handler.Handle(
            new ReorderRegionsCommand { OrderedRegionIds = [garden.Id, salon.Id, foreign.Id] }, CancellationToken.None);

        Assert.False(partial.IsSuccess);
        Assert.False(withForeign.IsSuccess);
        Assert.Equal(0, salon.SortOrder);
        Assert.Equal(1, garden.SortOrder);
    }

    [Fact]
    public async Task NewRegion_GoesAfterHighestSortOrder()
    {
        await SeedActorAsync();
        Region salon = await AddRegionAsync("Salon");
        salon.SetSortOrder(4);
        await DbContext.SaveChangesAsync();

        var result = await new CreateRegionCommandHandler(Db, CurrentUser).Handle(
            new CreateRegionCommand { Name = "Teras" }, CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);

        var regions = await new GetAllRegionQueryHandler(Db, CurrentUser).Handle(new GetAllRegionQuery(), CancellationToken.None);
        Assert.Equal(["Salon", "Teras"], regions.Value!.Select(r => r.Name));
        Assert.Equal(5, DbContext.Regions.Single(r => r.Name == "Teras").SortOrder);
    }

    [Theory]
    [InlineData("Masa 2", "Masa 10")]
    [InlineData("masa 2", "Masa 3")]
    [InlineData("A1", "A01b")]
    [InlineData("Bahçe", "Masa 1")]
    [InlineData("Çay Ocağı", "Dış Masa")]
    public void NaturalComparer_OrdersNumbersByValue(string first, string second)
    {
        Assert.True(NaturalStringComparer.Instance.Compare(first, second) < 0);
        Assert.True(NaturalStringComparer.Instance.Compare(second, first) > 0);
    }
}
