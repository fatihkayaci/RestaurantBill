using System.Text;
using System.Text.Encodings.Web;
using System.Text.RegularExpressions;
using System.Text.Unicode;

namespace RestaurantBill.Application.Features.CustomerSite.Seo;

/// <summary>Sayfanın &lt;head&gt;'ine yazılacak değerler. Url ve ImageUrl boşsa o etiketler yazılmaz.</summary>
public sealed record SiteMeta(string Title, string Description, string SiteName, string Url, string ImageUrl, bool NoIndex);

/// <summary>
/// Ön yüzün derlenmiş index.html'ine restoranın başlık/açıklama/og etiketlerini yazar. Botlar (Google, WhatsApp,
/// Instagram) JavaScript çalıştırmadığı için bu etiketler sunucuda HTML'e girmelidir. Yalnızca &lt;head&gt; değişir:
/// eski &lt;title&gt;, description, robots, canonical, og:* ve twitter:* etiketleri çıkarılıp yenileri yazılır; betikler,
/// stiller ve diğer etiketler olduğu gibi kalır. Her değer HTML-kodlanır.
/// </summary>
public static class SiteMetaHtml
{
    // Türkçe harfler okunur kalsın (&#252; yerine ü); <, >, &, ", ' yine kodlanır.
    private static readonly HtmlEncoder Encoder = HtmlEncoder.Create(UnicodeRanges.All);

    private static readonly Regex TitleTag = new(@"<title\b[^>]*>.*?</title\s*>", RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly Regex ReplacedTags = new(
        @"[ \t]*(?:<meta\b[^>]*\b(?:name|property)\s*=\s*[""'](?:description|robots|og:[^""']*|twitter:[^""']*)[""'][^>]*>" +
        @"|<link\b[^>]*\brel\s*=\s*[""']canonical[""'][^>]*>)[ \t]*\r?\n?",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex HeadClose = new(@"</head\s*>", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static string Encode(string value) => Encoder.Encode(value ?? string.Empty);

    /// <summary>Etiketleri yazar; &lt;/head&gt; bulunamazsa HTML'i değiştirmeden döner.</summary>
    public static string Inject(string html, SiteMeta meta)
    {
        Match headClose = HeadClose.Match(html);
        if (!headClose.Success) return html;

        string head = html[..headClose.Index];
        string rest = html[headClose.Index..];

        string block = Render(meta);
        Match title = TitleTag.Match(head);
        if (title.Success)
        {
            // Yeni blok eski <title>'ın yerine; diğer eski etiketler çıkarılır.
            string before = ReplacedTags.Replace(head[..title.Index], string.Empty);
            string after = ReplacedTags.Replace(head[(title.Index + title.Length)..], string.Empty);
            return before + block + after + rest;
        }

        head = ReplacedTags.Replace(head, string.Empty);
        return head + "  " + block + "\n  " + rest;
    }

    private static string Render(SiteMeta m)
    {
        string title = Encode(m.Title), description = Encode(m.Description);
        var sb = new StringBuilder();
        sb.Append("<title>").Append(title).Append("</title>");
        Meta(sb, "name", "description", description);
        if (m.NoIndex) Meta(sb, "name", "robots", "noindex");
        if (m.Url.Length > 0 && !m.NoIndex) sb.Append("\n    <link rel=\"canonical\" href=\"").Append(Encode(m.Url)).Append("\" />");
        Meta(sb, "property", "og:type", "website");
        Meta(sb, "property", "og:site_name", Encode(m.SiteName));
        Meta(sb, "property", "og:locale", "tr_TR");
        Meta(sb, "property", "og:title", title);
        Meta(sb, "property", "og:description", description);
        if (m.Url.Length > 0) Meta(sb, "property", "og:url", Encode(m.Url));
        if (m.ImageUrl.Length > 0) Meta(sb, "property", "og:image", Encode(m.ImageUrl));
        Meta(sb, "name", "twitter:card", m.ImageUrl.Length > 0 ? "summary_large_image" : "summary");
        Meta(sb, "name", "twitter:title", title);
        Meta(sb, "name", "twitter:description", description);
        if (m.ImageUrl.Length > 0) Meta(sb, "name", "twitter:image", Encode(m.ImageUrl));
        return sb.ToString();
    }

    // Değer zaten kodlanmış gelir.
    private static void Meta(StringBuilder sb, string attribute, string key, string encodedContent)
        => sb.Append("\n    <meta ").Append(attribute).Append("=\"").Append(key).Append("\" content=\"").Append(encodedContent).Append("\" />");
}
