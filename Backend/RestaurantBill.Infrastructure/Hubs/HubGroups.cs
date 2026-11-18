using RestaurantBill.Application.Common;

namespace RestaurantBill.Infrastructure.Hubs;

public static class HubGroups
{
    public static string Restaurant(Guid restaurantId) => $"restaurant-{restaurantId}";
    // Şubenin yöneticileri (Admin ve şubeye geçmiş Owner): kasiyer ekranlarına gitmemesi gereken uyarılar için.
    public static string BranchManagers(Guid restaurantId) => $"restaurant-{restaurantId}-managers";
    // Online (paket) sipariş ekranları: kasiyer, Admin ve Owner. "DeliveryOrdersChanged" ve paket siparişin "ItemsReady"si.
    public static string OnlineOrders(Guid restaurantId) => $"restaurant-{restaurantId}-online-orders";

    // Kasiyer hub'ına bağlanan kullanıcının grupları: herkes şubenin genel grubunda; Admin/Owner yöneticiler grubunda;
    // kasiyer, Admin ve Owner online siparişler grubunda. Mutfak, garson ve kurye online sipariş olaylarını almaz.
    public static List<string> ForCashierHub(Guid restaurantId, Func<string, bool> isInRole)
    {
        List<string> groups = [Restaurant(restaurantId)];
        bool isManager = isInRole("Admin") || isInRole("Owner");
        if (isManager)
            groups.Add(BranchManagers(restaurantId));
        if (isManager || isInRole("Cashier"))
            groups.Add(OnlineOrders(restaurantId));
        return groups;
    }
    // Kurye hub'ı: her kuryenin kendi grubu ve şubenin kurye olaylarını izleyen yöneticiler (Admin/Owner).
    public static string Courier(Guid restaurantId, Guid userId) => $"restaurant-{restaurantId}-courier-{userId}";
    public static string Couriers(Guid restaurantId) => $"restaurant-{restaurantId}-couriers";

    // Kurye yalnızca kendi grubuna girer (başka kuryenin olaylarını almaz); Admin/Owner yalnızca Couriers'a. Bir bağlantı
    // iki gruptan en fazla birindedir, CourierOrdersChangedTargets olayı kimseye iki kez göndermez.
    public static List<string> ForCourierHub(Guid restaurantId, Guid? userId, Func<string, bool> isInRole)
    {
        List<string> groups = [];
        if (isInRole("Courier") && userId is Guid id && id != Guid.Empty)
            groups.Add(Courier(restaurantId, id));
        if (isInRole("Admin") || isInRole("Owner"))
            groups.Add(Couriers(restaurantId));
        return groups;
    }

    public static string[] CourierOrdersChangedTargets(Guid restaurantId, Guid courierUserId) =>
        [Courier(restaurantId, courierUserId), Couriers(restaurantId)];

    // Garson grupları ("ürün hazır" bildirimi için). Bkz. ForWaiter ve ItemsReadyTargets.
    public static string WaiterRegion(Guid restaurantId, Guid regionId) => $"restaurant-{restaurantId}-waiters-region-{regionId}";
    public static string WaiterTable(Guid restaurantId, Guid tableId) => $"restaurant-{restaurantId}-waiters-table-{tableId}";
    public static string WaitersAll(Guid restaurantId) => $"restaurant-{restaurantId}-waiters-all";

    // Garsonun girdiği gruplar:
    //   - bölgesi boş (tüm bölgelere bakan) garson: yalnızca WaitersAll;
    //   - tamamına baktığı her bölge için WaiterRegion;
    //   - masa masa baktığı bölgelerde seçili her masa için WaiterTable; bu bölgelerin grubuna hiç girmez
    //     (seçili masası kalmamış bölge hiçbir grup katmaz).
    public static List<string> ForWaiter(Guid restaurantId, WaiterScope? scope)
    {
        if (scope is null)
            return [WaitersAll(restaurantId)];

        return
        [
            .. scope.WholeRegionIds.Select(regionId => WaiterRegion(restaurantId, regionId)),
            .. scope.TableIds.Select(tableId => WaiterTable(restaurantId, tableId)),
        ];
    }

    // Bir masa için "ürün hazır" bildiriminin hedefleri. ForWaiter'a göre bir garson bu üç gruptan en fazla birindedir:
    // masanın bölgesine tamamen bakıyorsa bölge grubunda, masa masa bakıyorsa masa grubunda, tüm bölgelere bakıyorsa
    // WaitersAll'da. Böylece kimse olayı iki kez almaz. Tek istisna bağlantı süresince olur: gruplar bağlanırken kurulur,
    // seçili bir masa bağlantı açıkken tamamına bakılan bir bölgeye taşınırsa garson yeniden bağlanana kadar o masa için
    // hem masa hem bölge grubundadır.
    public static string[] ItemsReadyTargets(Guid restaurantId, Guid regionId, Guid tableId) =>
        [WaiterRegion(restaurantId, regionId), WaiterTable(restaurantId, tableId), WaitersAll(restaurantId)];

    // Müşterinin QR'dan "Garson çağır"ı: "ürün hazır" ile aynı garsonlara, aynı kuralla (her garsona en fazla bir kez).
    public static string[] WaiterCallTargets(Guid restaurantId, Guid regionId, Guid tableId) =>
        ItemsReadyTargets(restaurantId, regionId, tableId);

    // A new table QR order request: the same waiters as "items ready", each at most once.
    public static string[] OrderRequestTargets(Guid restaurantId, Guid regionId, Guid tableId) =>
        ItemsReadyTargets(restaurantId, regionId, tableId);
}
