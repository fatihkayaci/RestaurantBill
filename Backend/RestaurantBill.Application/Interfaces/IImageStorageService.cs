namespace RestaurantBill.Application.Interfaces;

public interface IImageStorageService
{
    Task<string> UploadAsync(Stream content, Guid branchId, CancellationToken cancellationToken);
    Task DeleteAsync(string key, CancellationToken cancellationToken);
}
