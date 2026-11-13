using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeImageStorageService : IImageStorageService
{
    public List<string> UploadedKeys { get; } = [];
    public List<string> DeletedKeys { get; } = [];
    public Guid? LastBranchId { get; private set; }
    public string NextKey { get; set; } = "products/fake-key.webp";
    public bool ThrowOnUpload { get; set; }

    public Task<string> UploadAsync(Stream content, Guid branchId, CancellationToken cancellationToken)
    {
        if (ThrowOnUpload)
            throw new InvalidOperationException("Geçersiz görsel.");

        LastBranchId = branchId;
        UploadedKeys.Add(NextKey);
        return Task.FromResult(NextKey);
    }

    public string? LastFolder { get; private set; }
    public int? LastMaxSize { get; private set; }

    public Task<string> UploadAsync(Stream content, Guid branchId, string folder, int maxSize, CancellationToken cancellationToken)
    {
        LastFolder = folder;
        LastMaxSize = maxSize;
        return UploadAsync(content, branchId, cancellationToken);
    }

    public Task DeleteAsync(string key, CancellationToken cancellationToken)
    {
        DeletedKeys.Add(key);
        return Task.CompletedTask;
    }
}
