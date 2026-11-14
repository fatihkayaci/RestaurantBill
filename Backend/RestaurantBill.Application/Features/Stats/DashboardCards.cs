namespace RestaurantBill.Application.Features.Stats;

// Genel Bakış kart kataloğu. Frontend aynı kimlikleri kullanır; yeni kart eklenince iki tarafa da yazılır.
// "live" (Şu an) ve "overdue" (Geciken siparişler) kaldırıldı, bilgileri "tables" kartında. Kayıtlı düzenlerde
// kalmış olabilirler: okurken ve kaydederken bilinmeyen kimlikler atlanır (IsKnown).
public static class DashboardCards
{
    public static readonly IReadOnlyList<string> All =
        ["revenue", "pending", "tables", "hourly", "reservations", "top"];

    public static readonly IReadOnlyList<string> Default = All;

    public static bool IsKnown(string id) => All.Contains(id);
}
