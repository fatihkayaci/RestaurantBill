using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Common;

/// <summary>Sürükle-bırak sıralaması: ekrandan gelen id listesi grubun tamamı olmalı, sıra 0'dan başlayarak verilir.</summary>
public static class Reordering
{
    /// <summary>
    /// Liste grubun tüm kayıtlarını tam olarak bir kez içeriyorsa sıraları yazar ve true döner. Eksik, fazla ya da
    /// başka şubeden/gruptan id varsa hiçbir şeye dokunmaz: eski bir ekrandan ya da yetkisiz bir istekten gelmiştir.
    /// </summary>
    public static bool TryApply<T>(IReadOnlyCollection<T> items, IReadOnlyList<Guid> orderedIds, Action<T, int> setSortOrder)
        where T : BaseEntity
    {
        if (items.Count != orderedIds.Count || orderedIds.Distinct().Count() != orderedIds.Count)
            return false;

        Dictionary<Guid, T> byId = items.ToDictionary(i => i.Id);
        if (orderedIds.Any(id => !byId.ContainsKey(id)))
            return false;

        for (int i = 0; i < orderedIds.Count; i++)
            setSortOrder(byId[orderedIds[i]], i);
        return true;
    }
}
