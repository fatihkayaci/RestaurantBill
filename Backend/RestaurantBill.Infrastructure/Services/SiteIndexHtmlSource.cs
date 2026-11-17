using System.Net;
using System.Net.Http.Headers;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Infrastructure.Services;

/// <summary>
/// Ön yüzün derlenmiş index.html'i. Üretimde ön yüz konteynerinden (Seo:IndexHtmlUrl, ör. http://frontend/index.html)
/// her istekte ETag ile doğrulanır: dosya değişmediyse 304 gelir ve elde tutulan kopya kullanılır; ön yüz yeniden
/// yayınlanınca yeni asset adlarıyla gelen index.html hemen alınır (eski kopya kırık asset'lere bağlanmaz).
/// Ön yüze ulaşılamazsa son iyi kopya; hiç kopya yoksa null (uç 503 döner, nginx isteği doğrudan ön yüze verir).
/// Yerelde Seo:IndexHtmlPath ile bir dosyadan okunabilir.
/// </summary>
public sealed class SiteIndexHtmlSource(IHttpClientFactory httpClientFactory, IOptions<SeoOptions> options, ILogger<SiteIndexHtmlSource> logger)
    : ISiteIndexHtmlSource
{
    public const string HttpClientName = "site-index-html";

    private sealed record Cached(string Html, EntityTagHeaderValue? ETag, DateTimeOffset? LastModified);

    private volatile Cached? _cached;
    private (string Path, DateTime WriteTime, string Html)? _file;

    public async Task<string?> GetAsync(CancellationToken cancellationToken)
    {
        SeoOptions seo = options.Value;
        if (!string.IsNullOrWhiteSpace(seo.IndexHtmlUrl)) return await FromUrlAsync(seo.IndexHtmlUrl, cancellationToken);
        if (!string.IsNullOrWhiteSpace(seo.IndexHtmlPath)) return FromFile(seo.IndexHtmlPath);
        return null;
    }

    private async Task<string?> FromUrlAsync(string url, CancellationToken cancellationToken)
    {
        Cached? cached = _cached;
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            if (cached?.ETag is { } etag) request.Headers.IfNoneMatch.Add(etag);
            else if (cached?.LastModified is { } modified) request.Headers.IfModifiedSince = modified;

            using HttpResponseMessage response = await httpClientFactory.CreateClient(HttpClientName).SendAsync(request, cancellationToken);
            if (response.StatusCode == HttpStatusCode.NotModified && cached is not null) return cached.Html;
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("index.html alınamadı ({Status}); son kopya kullanılıyor.", (int)response.StatusCode);
                return cached?.Html;
            }

            string html = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!html.Contains("</head>", StringComparison.OrdinalIgnoreCase))
            {
                logger.LogWarning("index.html beklenen biçimde değil; son kopya kullanılıyor.");
                return cached?.Html;
            }

            _cached = new Cached(html, response.Headers.ETag, response.Content.Headers.LastModified);
            return html;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(ex, "index.html alınamadı; son kopya kullanılıyor.");
            return cached?.Html;
        }
    }

    private string? FromFile(string path)
    {
        try
        {
            string full = Path.GetFullPath(path);
            DateTime writeTime = File.GetLastWriteTimeUtc(full);
            if (_file is { } f && f.Path == full && f.WriteTime == writeTime) return f.Html;
            string html = File.ReadAllText(full);
            _file = (full, writeTime, html);
            return html;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            logger.LogWarning(ex, "index.html dosyası okunamadı ({Path}).", path);
            return _file?.Html;
        }
    }
}
