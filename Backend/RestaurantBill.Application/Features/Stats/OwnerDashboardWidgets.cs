namespace RestaurantBill.Application.Features.Stats;

// Şirket Genel Bakış'ı (sahip paneli) kart kataloğu. Frontend aynı kimlikleri kullanır; sıra varsayılan düzendir.
// Bu panelde kart gizlenmez, yalnızca sıralanır: kayıtlı sırada olmayan (yeni eklenmiş) kartlar sona eklenir,
// katalogdan çıkarılmış kimlikler atlanır.
public static class OwnerDashboardWidgets
{
    public static readonly IReadOnlyList<string> All =
        ["revenue", "orders", "avgBasket", "branches", "trend", "payments", "branchPerformance", "liveStatus", "auditLogs"];

    public static bool IsKnown(string id) => All.Contains(id);

    /// <summary>Kayıtlı sırayı katalogla birleştirir: bilinmeyenler atılır, eksikler sona eklenir.</summary>
    public static List<string> Merge(IEnumerable<string>? saved)
    {
        List<string> order = (saved ?? []).Where(IsKnown).Distinct().ToList();
        order.AddRange(All.Where(id => !order.Contains(id)));
        return order;
    }
}
