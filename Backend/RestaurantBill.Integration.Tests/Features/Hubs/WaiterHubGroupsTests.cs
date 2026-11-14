using RestaurantBill.Application.Common;
using RestaurantBill.Infrastructure.Hubs;

namespace RestaurantBill.Integration.Tests.Features.Hubs;

// "Ürün hazır" bildiriminin garson gruplarına yönlendirilmesi: garsonun girdiği gruplar (HubGroups.ForWaiter) ve
// bildirimin gittiği gruplar (HubGroups.ItemsReadyTargets).
public class WaiterHubGroupsTests
{
    private static readonly Guid Branch = Guid.NewGuid();
    private static readonly Guid Bahce = Guid.NewGuid();
    private static readonly Guid Salon = Guid.NewGuid();
    private static readonly Guid B1 = Guid.NewGuid();
    private static readonly Guid B2 = Guid.NewGuid();
    private static readonly Guid B3 = Guid.NewGuid();
    private static readonly Guid S1 = Guid.NewGuid();

    // Bahçe'den B1, B2'yi seçmiş, Salon'un tamamına bakan garson.
    private static readonly WaiterScope Restricted = WaiterScope.Resolve([Bahce, Salon], [Bahce], [(B1, Bahce), (B2, Bahce)]);

    [Fact]
    public void ForWaiter_TableRestrictedRegion_JoinsTableGroupsInsteadOfRegionGroup()
    {
        List<string> groups = HubGroups.ForWaiter(Branch, Restricted);

        Assert.Equal(
            new[] { HubGroups.WaiterRegion(Branch, Salon), HubGroups.WaiterTable(Branch, B1), HubGroups.WaiterTable(Branch, B2) }.Order(),
            groups.Order());
        Assert.DoesNotContain(HubGroups.WaiterRegion(Branch, Bahce), groups);
        Assert.DoesNotContain(HubGroups.WaitersAll(Branch), groups);
    }

    [Fact]
    public void ForWaiter_RestrictedRegionWithoutPicks_JoinsNoGroupForIt()
    {
        WaiterScope scope = WaiterScope.Resolve([Bahce, Salon], [Bahce], []);

        Assert.Equal([HubGroups.WaiterRegion(Branch, Salon)], HubGroups.ForWaiter(Branch, scope));
    }

    [Fact]
    public void ForWaiter_AllRegions_JoinsOnlyWaitersAll()
    {
        Assert.Equal([HubGroups.WaitersAll(Branch)], HubGroups.ForWaiter(Branch, null));
    }

    [Fact]
    public void ItemsReadyTargets_TargetsRegionTableAndAll()
    {
        Assert.Equal(
            [HubGroups.WaiterRegion(Branch, Bahce), HubGroups.WaiterTable(Branch, B3), HubGroups.WaitersAll(Branch)],
            HubGroups.ItemsReadyTargets(Branch, Bahce, B3));
    }

    // Her garson, her masa için: kapsamındaysa hedef gruplardan tam birinde, değilse hiçbirinde. Yani kimse olayı
    // iki kez almaz ve kapsam dışındaki garson hiç almaz.
    [Theory]
    [MemberData(nameof(Cases))]
    public void EachWaiter_ReceivesItemsReadyAtMostOnce_AndOnlyForCoveredTables(string waiter, Guid tableId, Guid regionId, int expected)
    {
        WaiterScope? scope = waiter switch
        {
            "restricted" => Restricted,
            "salonOnly" => WaiterScope.Resolve([Salon], [], []),
            "bahceNoPicks" => WaiterScope.Resolve([Bahce, Salon], [Bahce], []),
            _ => null
        };

        HashSet<string> joined = HubGroups.ForWaiter(Branch, scope).ToHashSet();
        int received = HubGroups.ItemsReadyTargets(Branch, regionId, tableId).Count(joined.Contains);

        Assert.Equal(expected, received);
    }

    public static TheoryData<string, Guid, Guid, int> Cases => new()
    {
        { "restricted", B1, Bahce, 1 },
        { "restricted", B3, Bahce, 0 },
        { "restricted", S1, Salon, 1 },
        { "salonOnly", B1, Bahce, 0 },
        { "salonOnly", S1, Salon, 1 },
        { "bahceNoPicks", B1, Bahce, 0 },
        { "bahceNoPicks", S1, Salon, 1 },
        { "all", B3, Bahce, 1 },
        { "all", S1, Salon, 1 },
    };
}
