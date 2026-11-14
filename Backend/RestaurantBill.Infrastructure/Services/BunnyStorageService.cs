using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Infrastructure.Services
{
    public sealed class BunnyStorageService : IImageStorageService
    {
        private readonly HttpClient _http;
        private readonly BunnyStorageOptions _options;

        public BunnyStorageService(HttpClient http, IOptions<BunnyStorageOptions> options)
        {
            _http = http;
            _options = options.Value;
        }

        public Task<string> UploadAsync(Stream content, Guid branchId, CancellationToken cancellationToken)
            => UploadAsync(content, branchId, "products", 800, cancellationToken);

        public async Task<string> UploadAsync(Stream content, Guid branchId, string folder, int maxSize, CancellationToken cancellationToken)
        {
            // Dosya boyutu controller/validator'da sınırlı (en çok 10 MB); Skia bayt dizisinden çözer.
            using var buffer = new MemoryStream();
            await content.CopyToAsync(buffer, cancellationToken);

            // Doğrulama (yalnızca JPEG/PNG/WebP, en çok 40 MP), sığdırma, EXIF yönü ve WebP kalite 80: UploadImageProcessor.
            byte[] webp = UploadImageProcessor.ToWebp(buffer.ToArray(), maxSize);

            string key = $"{folder}/{branchId:N}/{Guid.NewGuid():N}.webp";
            string url = $"https://storage.bunnycdn.com/{_options.StorageZoneName}/{key}";

            using var request = new HttpRequestMessage(HttpMethod.Put, url);
            request.Headers.Add("AccessKey", _options.AccessKey);
            request.Content = new ByteArrayContent(webp);
            request.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/webp");

            HttpResponseMessage response = await _http.SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();

            return key;
        }

        public async Task DeleteAsync(string key, CancellationToken cancellationToken)
        {
            string url = $"https://storage.bunnycdn.com/{_options.StorageZoneName}/{key}";
            using var request = new HttpRequestMessage(HttpMethod.Delete, url);
            request.Headers.Add("AccessKey", _options.AccessKey);
            await _http.SendAsync(request, cancellationToken);
        }
    }
}
