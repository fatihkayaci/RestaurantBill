using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.CustomerSite.Seo;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.CustomerSite;

// Google/paylaşım: otomatik başlık ve açıklama, sayfa başlıkları, index.html'e etiket yazma (HTML-kodlama, bilinmeyen slug).
public class SiteSeoTests
{
    // Ön yüzün index.html'inin derlenmiş hâline benzer (vite asset satırlarıyla).
    private const string IndexHtml = """
        <!doctype html>
        <html lang="tr">
          <head>
            <meta charset="UTF-8" />
            <link rel="icon" type="image/svg+xml" href="/sophram-logo.svg" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Sophram — Restoran Yönetim Sistemi</title>
            <meta name="description" content="Garson, mutfak, kasa ve yönetimi tek sistemde." />
            <meta name="theme-color" content="#1C1510" />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="Sophram" />
            <meta property="og:title" content="Sophram — Siparişten hesaba, tek akışta" />
            <meta name="twitter:card" content="summary" />
            <script type="module" crossorigin src="/assets/index-AbC123.js"></script>
            <link rel="stylesheet" crossorigin href="/assets/index-XyZ789.css">
          </head>
          <body>
            <div id="root"></div>
            <meta name="description" content="gövdedeki etiket dokunulmaz" />
          </body>
        </html>
        """;

    private static SiteSnapshot Site(string tagline = "Közde pişen et.") => new() { Tagline = tagline };

    private static List<SiteDayHours> Week(Func<DayOfWeek, SiteDayHours> day) => SiteContent.WeekOrder.Select(day).ToList();

    // ── Otomatik değerler ───────────────────────────────────────────────────────────────────────
    [Fact]
    public void AutoValues_TitleIsNameAndDistrict_DescriptionJoinsTaglineDistrictHours()
    {
        SiteSnapshot site = Site() with { OpensAt = new TimeOnly(8, 0), ClosesAt = new TimeOnly(23, 0), CoverImage = "site/kapak.webp" };

        SiteSeoValues seo = SiteSeo.Resolve(site, "Ocak", "Moda", "Kadıköy");

        Assert.Equal("Ocak · Kadıköy", seo.Title);
        Assert.Equal("Közde pişen et. · Kadıköy · Her gün 08:00–23:00", seo.Description);
        Assert.Equal("site/kapak.webp", seo.ShareImageKey);
    }

    [Fact]
    public void AutoDescription_IsNotTruncated()
    {
        string longTagline = new('a', 300);

        Assert.StartsWith(longTagline, SiteSeo.Resolve(Site(longTagline), "Ocak", "", "").Description);
    }

    [Fact]
    public void CustomValues_WinOverAuto_EmptyMeansAuto()
    {
        SiteSnapshot site = Site() with
        {
            CoverImage = "site/kapak.webp",
            Content = SiteContent.Empty with { SeoTitle = "Ocak Kadıköy", SeoDescription = "  ", ShareImage = "shared/stock/mangal.webp" },
        };

        SiteSeoValues seo = SiteSeo.Resolve(site, "Ocak", "Moda", "Kadıköy");

        Assert.Equal("Ocak Kadıköy", seo.Title);
        Assert.Equal(seo.AutoDescription, seo.Description);
        Assert.Equal("shared/stock/mangal.webp", seo.ShareImageKey);
        Assert.Equal("site/kapak.webp", seo.AutoShareImageKey);
    }

    [Fact]
    public void HoursLine_GroupsConsecutiveDays_AndSkipsClosedDays()
    {
        SiteSnapshot tuesdayToSunday = Site() with
        {
            Content = SiteContent.Empty with
            {
                WeeklyHours = Week(d => new SiteDayHours(d, d != DayOfWeek.Monday, new TimeOnly(12, 0), new TimeOnly(23, 0))),
            },
        };
        SiteSnapshot everyDay = Site() with
        {
            Content = SiteContent.Empty with { WeeklyHours = Week(d => new SiteDayHours(d, true, new TimeOnly(9, 0), new TimeOnly(22, 0))) },
        };
        SiteSnapshot weekend = Site() with
        {
            Content = SiteContent.Empty with
            {
                WeeklyHours = Week(d => d is DayOfWeek.Saturday or DayOfWeek.Sunday
                    ? new SiteDayHours(d, true, new TimeOnly(10, 0), new TimeOnly(0, 0))
                    : new SiteDayHours(d, true, new TimeOnly(9, 0), new TimeOnly(22, 0))),
            },
        };

        Assert.Equal("Salı–Pazar 12:00–23:00", SiteSeo.HoursLine(tuesdayToSunday));
        Assert.Equal("Her gün 09:00–22:00", SiteSeo.HoursLine(everyDay));
        Assert.Equal("Pazartesi–Cuma 09:00–22:00, Cumartesi–Pazar 10:00–00:00", SiteSeo.HoursLine(weekend));
        Assert.Equal(string.Empty, SiteSeo.HoursLine(Site()));
    }

    [Fact]
    public void EmptySite_DescriptionStillSaysSomething()
    {
        Assert.Equal("Ocak · Menü, saatler ve iletişim", SiteSeo.Resolve(Site(""), "Ocak", "", "").Description);
    }

    [Theory]
    [InlineData("/", "Ocak · Kadıköy", false)]
    [InlineData("", "Ocak · Kadıköy", false)]
    [InlineData("/menu", "Menü · Ocak", false)]
    [InlineData("/Menu/?kategori=1", "Menü · Ocak", false)]
    [InlineData("/hakkimizda", "Hakkımızda · Ocak", false)]
    [InlineData("/mekan", "Mekân · Ocak", false)]
    [InlineData("/iletisim", "İletişim · Ocak", false)]
    [InlineData("/rezervasyon", "Rezervasyon · Ocak", false)]
    [InlineData("/siparis", "Paket sipariş · Ocak", false)]
    [InlineData("/rezervasyon/AbC123", "Rezervasyonunuz · Ocak", true)]
    [InlineData("/siparis/takip/xyz", "Sipariş takibi · Ocak", true)]
    [InlineData("/masa/5b2c", "Masadan sipariş · Ocak", true)]
    [InlineData("/admin/site", "Ocak · Kadıköy", true)]
    public void PageTitle_KnownRoutes(string path, string title, bool noIndex)
    {
        SitePageTitle page = SiteSeo.PageTitle(path, "Ocak", "Ocak · Kadıköy");

        Assert.Equal(title, page.Title);
        Assert.Equal(noIndex, page.NoIndex);
    }

    // ── index.html'e etiket yazma ───────────────────────────────────────────────────────────────
    [Fact]
    public void Inject_ReplacesHeadTags_EncodesValues_KeepsEverythingElse()
    {
        var meta = new SiteMeta(
            "Ocak & Şürekâ <script>alert(1)</script>", "Közde \"pişen\" et · Kadıköy", "Ocak",
            "https://ocak.sophram.com/menu", "https://cdn.test/site/kapak.webp?a=1&b=2", NoIndex: false);

        string html = SiteMetaHtml.Inject(IndexHtml, meta);

        Assert.DoesNotContain("Sophram — Restoran Yönetim Sistemi", html);
        Assert.DoesNotContain("Garson, mutfak", html);
        Assert.DoesNotContain("content=\"Sophram\"", html);
        Assert.DoesNotContain("<script>alert(1)</script>", html);
        Assert.Contains("<title>Ocak &amp; Şürekâ &lt;script&gt;alert(1)&lt;/script&gt;</title>", html);
        Assert.Contains("<meta name=\"description\" content=\"Közde &quot;pişen&quot; et · Kadıköy\" />", html);
        Assert.Contains("<meta property=\"og:image\" content=\"https://cdn.test/site/kapak.webp?a=1&amp;b=2\" />", html);
        Assert.Contains("<meta property=\"og:url\" content=\"https://ocak.sophram.com/menu\" />", html);
        Assert.Contains("<link rel=\"canonical\" href=\"https://ocak.sophram.com/menu\" />", html);
        Assert.Contains("<meta name=\"twitter:card\" content=\"summary_large_image\" />", html);
        Assert.Contains("<meta property=\"og:site_name\" content=\"Ocak\" />", html);
        // Diğer etiketler, betikler ve gövde aynen kalır.
        Assert.Contains("<script type=\"module\" crossorigin src=\"/assets/index-AbC123.js\"></script>", html);
        Assert.Contains("<link rel=\"stylesheet\" crossorigin href=\"/assets/index-XyZ789.css\">", html);
        Assert.Contains("<meta name=\"theme-color\" content=\"#1C1510\" />", html);
        Assert.Contains("<meta name=\"description\" content=\"gövdedeki etiket dokunulmaz\" />", html);
        Assert.Single(System.Text.RegularExpressions.Regex.Matches(html, "<title>"));
        Assert.Single(System.Text.RegularExpressions.Regex.Matches(html, "og:title"));
    }

    [Fact]
    public void Inject_NoImage_UsesSummaryCard_NoIndexSkipsCanonical()
    {
        string html = SiteMetaHtml.Inject(IndexHtml, new SiteMeta("Rezervasyonunuz · Ocak", "x", "Ocak", "https://ocak.sophram.com/rezervasyon/t", "", NoIndex: true));

        Assert.DoesNotContain("og:image", html);
        Assert.Contains("<meta name=\"twitter:card\" content=\"summary\" />", html);
        Assert.Contains("<meta name=\"robots\" content=\"noindex\" />", html);
        Assert.DoesNotContain("canonical", html);
    }

    [Fact]
    public void Inject_WithoutHead_ReturnsInputUnchanged()
    {
        Assert.Equal("<html><body>x</body></html>", SiteMetaHtml.Inject("<html><body>x</body></html>", new SiteMeta("a", "b", "c", "", "", false)));
    }

    // ── Uç: GET api/public/site-html ────────────────────────────────────────────────────────────
    public class HandlerTests : ApplicationTestBase
    {
        private sealed class FakeIndexHtml(string? html) : ISiteIndexHtmlSource
        {
            public Task<string?> GetAsync(CancellationToken cancellationToken) => Task.FromResult(html);
        }

        private readonly FakeTenantResolver _tenant = new() { Slug = "ocak" };

        private GetSiteHtmlQueryHandler Handler(string? html = IndexHtml) => new(
            Db, _tenant, new FakeIndexHtml(html),
            Options.Create(new BunnyStorageOptions { CdnBaseUrl = "https://cdn.test/" }),
            Options.Create(new SeoOptions()),
            NullLogger<GetSiteHtmlQueryHandler>.Instance);

        private async Task SeedAsync()
        {
            User owner = await SeedActorAsync();
            Company company = Company.Create("Ocak", owner);
            company.Slug = "ocak";
            DbContext.Companies.Add(company);
            Branch branch = Branch.Create(company.Id, "Moda", "", "", "", "İstanbul", "Kadıköy", "", 10m);
            branch.UpdateSite("", "Közde pişen et.", "", "", new TimeOnly(12, 0), new TimeOnly(23, 0), "", "", "");
            branch.ReplaceSiteImage(SiteImageSlot.Cover, "site/kapak.webp");
            // Taslaktaki değer sitede görünmez: etiketler yayındaki değerlerle yazılır.
            branch.SaveSiteDraft(branch.GetPublishedSite() with { Tagline = "TASLAK" }, DateTime.UtcNow);
            DbContext.Branches.Add(branch);
            await DbContext.SaveChangesAsync();
        }

        [Fact]
        public async Task KnownSlug_InjectsPublishedValues_WithPageTitle()
        {
            await SeedAsync();

            var result = await Handler().Handle(new GetSiteHtmlQuery { Path = "/menu" }, CancellationToken.None);

            Assert.True(result.IsSuccess, result.Error);
            string html = result.Value!;
            Assert.Contains("<title>Menü · Ocak</title>", html);
            Assert.Contains("content=\"Közde pişen et. · Kadıköy · Her gün 12:00–23:00\"", html);
            Assert.Contains("<meta property=\"og:image\" content=\"https://cdn.test/site/kapak.webp\" />", html);
            Assert.Contains("<meta property=\"og:url\" content=\"https://ocak.sophram.com/menu\" />", html);
            Assert.DoesNotContain("TASLAK", html);
        }

        [Fact]
        public async Task UnknownSlug_ReturnsIndexHtmlUnchanged()
        {
            await SeedAsync();
            _tenant.Slug = "yok-boyle-restoran";

            var result = await Handler().Handle(new GetSiteHtmlQuery { Path = "/" }, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(IndexHtml, result.Value);
        }

        [Fact]
        public async Task NoSlug_ReturnsIndexHtmlUnchanged()
        {
            _tenant.Slug = null;

            var result = await Handler().Handle(new GetSiteHtmlQuery { Path = "/" }, CancellationToken.None);

            Assert.Equal(IndexHtml, result.Value);
        }

        [Fact]
        public async Task IndexHtmlUnavailable_Fails()
        {
            var result = await Handler(html: null).Handle(new GetSiteHtmlQuery { Path = "/" }, CancellationToken.None);

            Assert.False(result.IsSuccess);
            Assert.Equal(GetSiteHtmlQueryHandler.UnavailableMessage, result.Error);
        }
    }
}
