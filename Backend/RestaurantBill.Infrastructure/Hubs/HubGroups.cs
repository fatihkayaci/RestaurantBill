namespace RestaurantBill.Infrastructure.Hubs;

public static class HubGroups
{
    public static string Restaurant(Guid restaurantId) => $"restaurant-{restaurantId}";
    // Şubenin yöneticileri (Admin ve şubeye geçmiş Owner): kasiyer ekranlarına gitmemesi gereken uyarılar için.
    public static string BranchManagers(Guid restaurantId) => $"restaurant-{restaurantId}-managers";
}
