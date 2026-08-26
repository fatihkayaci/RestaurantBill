using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

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

        public async Task<string> UploadAsync(Stream content, CancellationToken cancellationToken)
        {
            using Image image = await Image.LoadAsync(content, cancellationToken);

            image.Mutate(x => x.Resize(new ResizeOptions
            {
                Mode = ResizeMode.Max,
                Size = new Size(800, 800)
            }));

            using var output = new MemoryStream();
            await image.SaveAsWebpAsync(output, new WebpEncoder { Quality = 80 }, cancellationToken);
            output.Position = 0;

            string key = $"products/{Guid.NewGuid():N}.webp";
            string url = $"https://storage.bunnycdn.com/{_options.StorageZoneName}/{key}";

            using var request = new HttpRequestMessage(HttpMethod.Put, url);
            request.Headers.Add("AccessKey", _options.AccessKey);
            request.Content = new StreamContent(output);
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
