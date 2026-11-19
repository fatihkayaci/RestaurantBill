using RestaurantBill.Application.Common;
using RestaurantBill.Infrastructure.Hubs;

namespace RestaurantBill.Integration.Tests.Features.Hubs;

// Kasiyer hub'ında masaya özgü "Hesap istendi" bildirimi: bölge/masa atanmış kasiyer yalnızca kapsamındaki masaların
// bildirimini alır; yönetici ve kapsamı boş kasiyer hepsini (CashiersAll). Kural garson gruplarıyla aynıdır.
public class CashierHubGroupsTests
{
    private static readonly Guid Branch = Guid.NewGuid();
    private static readonly Guid Bahce = Guid.NewGuid();
    private static readonly Guid Salon = Guid.NewGuid();
    private static readonly Guid B1 = Guid.NewGuid();
    private static readonly Guid B3 = Guid.NewGuid();
    private static readonly Guid S1 = Guid.NewGuid();

    // Bahçe'den yalnızca B1'i seçmiş, Salon'un tamamına bakan kasiyer.
    private static readonly WaiterScope Restricted = WaiterScope.Resolve([Bahce, Salon], [Bahce], [(B1, Bahce)]);

    private static Func<string, bool> Role(string role) => r => r == role;

    [Fact]
    public void ScopedCashier_JoinsRegionAndTableGroups_NotCashiersAll()
    {
        List<string> groups = HubGroups.ForCashierHub(Branch, Role("Cashier"), Restricted);

        Assert.Contains(HubGroups.Restaurant(Branch), groups);
        Assert.Contains(HubGroups.OnlineOrders(Branch), groups);
        Assert.Contains(HubGroups.CashierRegion(Branch, Salon), groups);
        Assert.Contains(HubGroups.CashierTable(Branch, B1), groups);
        Assert.DoesNotContain(HubGroups.CashierRegion(Branch, Bahce), groups);
        Assert.DoesNotContain(HubGroups.CashiersAll(Branch), groups);
    }

    // "Paket siparişler" yetkisi olmayan kasiyer online sipariş olaylarını almaz; bölge kapsamından bağımsızdır.
    [Fact]
    public void CashierWithoutDeliveryPermission_DoesNotJoinOnlineOrders()
    {
        Assert.DoesNotContain(HubGroups.OnlineOrders(Branch), HubGroups.ForCashierHub(Branch, Role("Cashier"), null, canViewDelivery: false));
        Assert.DoesNotContain(HubGroups.OnlineOrders(Branch), HubGroups.ForCashierHub(Branch, Role("Cashier"), Restricted, canViewDelivery: false));
        Assert.Contains(HubGroups.OnlineOrders(Branch), HubGroups.ForCashierHub(Branch, Role("Admin"), null, canViewDelivery: false));
    }

    [Fact]
    public void ManagerAndUnscopedCashier_JoinCashiersAll()
    {
        Assert.Contains(HubGroups.CashiersAll(Branch), HubGroups.ForCashierHub(Branch, Role("Admin")));
        Assert.Contains(HubGroups.CashiersAll(Branch), HubGroups.ForCashierHub(Branch, Role("Cashier"), null));
    }

    [Theory]
    [MemberData(nameof(Cases))]
    public void EachConnection_ReceivesBillRequestAtMostOnce_AndOnlyForCoveredTables(string who, Guid tableId, Guid regionId, int expected)
    {
        List<string> groups = who switch
        {
            "restricted" => HubGroups.ForCashierHub(Branch, Role("Cashier"), Restricted),
            "membershipMissing" => HubGroups.ForCashierHub(Branch, Role("Cashier"), WaiterScope.Empty),
            "allCashier" => HubGroups.ForCashierHub(Branch, Role("Cashier"), null),
            _ => HubGroups.ForCashierHub(Branch, Role("Admin")),
        };

        int received = HubGroups.CashierTableTargets(Branch, regionId, tableId).Count(groups.Contains);

        Assert.Equal(expected, received);
    }

    public static TheoryData<string, Guid, Guid, int> Cases => new()
    {
        { "restricted", B1, Bahce, 1 },
        { "restricted", B3, Bahce, 0 },
        { "restricted", S1, Salon, 1 },
        { "membershipMissing", S1, Salon, 0 },
        { "allCashier", B3, Bahce, 1 },
        { "admin", B3, Bahce, 1 },
        { "admin", S1, Salon, 1 },
    };
}
