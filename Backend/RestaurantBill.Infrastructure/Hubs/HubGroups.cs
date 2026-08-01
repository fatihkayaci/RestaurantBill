namespace RestaurantBill.Infrastructure.Hubs;

public static class HubGroups
{
    public static string Restaurant(Guid restaurantId) => $"restaurant-{restaurantId}";
}
