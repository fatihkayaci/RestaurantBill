namespace RestaurantBill.Application.Interfaces;

/// <summary>Kapatılıp bekleme süresi dolan şirketleri kalıcı olarak siler (arka plan işi çağırır).</summary>
public interface ICompanyPurger
{
    /// <summary>Süresi dolan şirketleri teker teker siler; silinen şirket sayısını döner. Tekrar çağrılması güvenlidir.</summary>
    Task<int> PurgeDueAsync(DateTime nowUtc, CancellationToken cancellationToken);
}
