namespace RestaurantBill.Application.Features.Stats;

// Genel Bakış kart kataloğu. Frontend aynı kimlikleri kullanır; yeni kart eklenince iki tarafa da yazılır.
public static class DashboardCards
{
    public static readonly IReadOnlyList<string> All =
        ["revenue", "live", "pending", "overdue", "tables", "hourly", "reservations", "top"];

    public static readonly IReadOnlyList<string> Default = All;

    public static bool IsKnown(string id) => All.Contains(id);
}
