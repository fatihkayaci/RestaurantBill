namespace RestaurantBill.Application.Common;

/// <summary>
/// Restoran sitelerinin sunucu tarafı başlık/og etiketleri (GET api/public/site-html). index.html, ön yüzün derlenmiş
/// dosyasıdır: üretimde ön yüz konteynerinden (IndexHtmlUrl), yerelde dosyadan (IndexHtmlPath) okunur.
/// </summary>
public class SeoOptions
{
    public const string SectionName = "Seo";

    /// <summary>Ör. "http://frontend/index.html" (compose ağı). Her istekte If-None-Match ile doğrulanır, hata olursa son iyi kopya.</summary>
    public string IndexHtmlUrl { get; set; } = string.Empty;

    /// <summary>IndexHtmlUrl yoksa okunacak dosya (yerelde ör. "../../frontend/dist/index.html").</summary>
    public string IndexHtmlPath { get; set; } = string.Empty;

    /// <summary>Restoran adresi: https://{slug}.{RootDomain}{yol} (canonical ve og:url).</summary>
    public string RootDomain { get; set; } = "sophram.com";
}
