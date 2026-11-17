using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Domain.Shared;
using RestaurantBill.Application.Features.Delivery.Settings;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Tests.Features.Delivery;

// Bölgeler sekmesinin tek "Kaydet"i: tüm bölgeler, değerleri ve sırası birlikte; ya hepsi ya hiçbiri.
public class DeliveryZonesBulkTests : DeliveryTestBase
{
    private DeliveryZone Fenerbahce = default!;

    private async Task SeedZonesAsync()
    {
        await SeedAsync();
        Fenerbahce = DeliveryZone.Create(Branch.Id, "Fenerbahçe", 30m, 150m, 50, 1);
        DbContext.DeliveryZones.Add(Fenerbahce);
        await DbContext.SaveChangesAsync();
    }

    private static DeliveryZoneBulkItem Item(DeliveryZone zone, string? name = null, decimal? fee = null, bool? active = null) => new()
    {
        Id = zone.Id,
        Name = name ?? zone.Name,
        Fee = fee ?? zone.Fee,
        MinOrderAmount = zone.MinOrderAmount,
        EstimatedMinutes = zone.EstimatedMinutes,
        IsActive = active ?? zone.IsActive
    };

    private Task<Result<List<DeliveryZoneDto>>> SaveAsync(params DeliveryZoneBulkItem[] items)
        => new SaveDeliveryZonesBulkCommandHandler(Db, CurrentUser)
            .Handle(new SaveDeliveryZonesBulkCommand { Zones = items.ToList() }, CancellationToken.None);

    [Fact]
    public async Task Bulk_SavesValuesActiveFlagsAndOrder_Together()
    {
        await SeedZonesAsync();

        var result = await SaveAsync(Item(Fenerbahce, fee: 35m, active: false), Item(Moda, name: "Moda Sahil"));

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(["Fenerbahçe", "Moda Sahil"], result.Value!.Select(z => z.Name));
        Assert.Equal(0, Fenerbahce.SortOrder);
        Assert.Equal(35m, Fenerbahce.Fee);
        Assert.False(Fenerbahce.IsActive);
        Assert.Equal(1, Moda.SortOrder);
        Assert.Equal("Moda Sahil", Moda.Name);
        Assert.Equal(2, DbContext.AuditLogs.Count(a => a.Action == "DeliveryZoneUpdated"));
    }

    [Fact]
    public async Task Bulk_SwappingNames_IsAllowed()
    {
        await SeedZonesAsync();

        var result = await SaveAsync(Item(Moda, name: "Fenerbahçe"), Item(Fenerbahce, name: "Moda"));

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal("Fenerbahçe", Moda.Name);
        Assert.Equal("Moda", Fenerbahce.Name);
    }

    [Fact]
    public async Task Bulk_DuplicateNames_Fail()
    {
        await SeedZonesAsync();

        var result = await SaveAsync(Item(Moda), Item(Fenerbahce, name: " moda "));

        Assert.False(result.IsSuccess);
        Assert.Contains("birden fazla", result.Error);
    }

    [Fact]
    public async Task Bulk_StaleList_Fails()
    {
        await SeedZonesAsync();

        var missing = await SaveAsync(Item(Moda));
        Assert.Equal(SaveDeliveryZonesBulkCommandHandler.StaleListMessage, missing.Error);

        var unknown = await SaveAsync(Item(Moda), new DeliveryZoneBulkItem { Id = Guid.NewGuid(), Name = "Yok", EstimatedMinutes = 30 });
        Assert.Equal(SaveDeliveryZonesBulkCommandHandler.StaleListMessage, unknown.Error);
    }

    [Fact]
    public async Task Bulk_InvalidValue_FailsWithZoneName_AndSavesNothing()
    {
        await SeedZonesAsync();

        var result = await SaveAsync(Item(Moda, fee: 25m), Item(Fenerbahce, fee: -1m));

        Assert.False(result.IsSuccess);
        Assert.StartsWith("Fenerbahçe:", result.Error);
        DbContext.ChangeTracker.Clear();
        Assert.Equal(20m, DbContext.DeliveryZones.Single(z => z.Id == Moda.Id).Fee);
    }

    [Fact]
    public void Validator_RejectsEmptyName()
    {
        var validator = new SaveDeliveryZonesBulkCommandValidator();
        var command = new SaveDeliveryZonesBulkCommand { Zones = [new DeliveryZoneBulkItem { Id = Guid.NewGuid(), Name = " ", EstimatedMinutes = 30 }] };
        Assert.False(validator.Validate(command).IsValid);
    }
}
