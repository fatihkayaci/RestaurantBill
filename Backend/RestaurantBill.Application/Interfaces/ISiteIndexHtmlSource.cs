namespace RestaurantBill.Application.Interfaces;

/// <summary>Ön yüzün derlenmiş index.html'i (betik ve stil bağlantılarıyla). Alınamıyorsa ve elde kopya yoksa null.</summary>
public interface ISiteIndexHtmlSource
{
    Task<string?> GetAsync(CancellationToken cancellationToken);
}
