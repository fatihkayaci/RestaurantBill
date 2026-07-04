namespace RestaurantBill.Infrastructure.Hubs;

public static class HubGroups
{
    public static string Restaurant(int restaurantId) => $"restaurant-{restaurantId}";
}
