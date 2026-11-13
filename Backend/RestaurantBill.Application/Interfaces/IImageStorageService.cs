namespace RestaurantBill.Application.Interfaces;

public interface IImageStorageService
{
    /// <summary>Ürün görseli: en çok 800 px, products/ klasörüne.</summary>
    Task<string> UploadAsync(Stream content, Guid branchId, CancellationToken cancellationToken);

    /// <summary>Uzun kenarı en çok <paramref name="maxSize"/> px olacak şekilde küçültüp <paramref name="folder"/>/ altına yükler; anahtarı döner.</summary>
    Task<string> UploadAsync(Stream content, Guid branchId, string folder, int maxSize, CancellationToken cancellationToken);

    Task DeleteAsync(string key, CancellationToken cancellationToken);
}
