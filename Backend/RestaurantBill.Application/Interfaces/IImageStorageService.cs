namespace RestaurantBill.Application.Interfaces;

public interface IImageStorageService
{
    Task<string> UploadAsync(Stream content, CancellationToken cancellationToken);
    Task DeleteAsync(string key, CancellationToken cancellationToken);
}
