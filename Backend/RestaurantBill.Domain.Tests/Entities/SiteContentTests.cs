using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

// Restoran sitesinin ek içeriği: doğrulama sınırları, fotoğrafların korunması; şubenin site bilgileri (haftalık saat,
// WhatsApp, nasıl gelinir) ve "şu an açık".
public class SiteContentTests
{
    private const int Year = 2026;

    private static Branch NewBranch() => Branch.Create(Guid.NewGuid(), "Merkez", "", "", "", "İstanbul", "Kadıköy", "", 10m);

    private static SiteContent Texts(SiteContentTexts texts) => SiteContent.Empty.WithTexts(texts, Year);

    private static List<SiteDayHours> Week(string opens = "09:00", string closes = "23:00", params DayOfWeek[] closed)
        => SiteContent.WeekOrder.Select(d => new SiteDayHours(d, !closed.Contains(d), TimeOnly.Parse(opens), TimeOnly.Parse(closes))).ToList();

    private static void SetInfo(Branch branch, IReadOnlyList<SiteDayHours>? week = null, TimeOnly? opens = null, TimeOnly? closes = null,
        string whatsapp = "", string directions = "", string hoursNote = "")
        => branch.UpdateSiteInfo(opens, closes, hoursNote, week ?? [], whatsapp, directions);

    [Fact]
    public void Unsaved_IsEmpty_WithDefaultTheme()
    {
        Branch branch = NewBranch();

        Assert.Null(branch.SiteContent);
        SiteContent content = branch.GetSiteContent();
        Assert.Equal(string.Empty, content.Theme);
        Assert.Empty(content.GalleryImages);
        Assert.Empty(content.WeeklyHours);
    }

    [Fact]
    public void WithTexts_TrimsAndKeepsAmenitiesInFixedOrder()
    {
        SiteContent c = Texts(new SiteContentTexts
        {
            Theme = " Zeytin ",
            Amenities = ["wifi", "AVLU", "wifi"],
            DirectionsNote = "  Metroya 4 dk  ",
            Rating = 4.66m,
            ReviewCount = 1240,
        });

        Assert.Equal("zeytin", c.Theme);
        Assert.Equal(["avlu", "wifi"], c.Amenities);
        Assert.Equal("Metroya 4 dk", c.DirectionsNote);
        Assert.Equal(4.7m, c.Rating);
        Assert.Equal(1240, c.ReviewCount);
    }

    [Theory]
    [InlineData("pembe")]
    [InlineData("white")]
    public void UnknownTheme_Throws(string theme)
        => Assert.Throws<DomainException>(() => Texts(new SiteContentTexts { Theme = theme }));

    [Theory]
    [InlineData("pembe")]
    [InlineData("tema2")]
    public void UnknownDesign_Throws(string design)
        => Assert.Throws<DomainException>(() => Texts(new SiteContentTexts { Design = design }));

    [Theory]
    [InlineData("renkli", "renkli")]
    [InlineData("sade", "sade")]
    [InlineData(" Elit ", "elit")]
    [InlineData(" Sicak ", "sicak")]
    public void KnownDesign_IsNormalized(string design, string expected)
        => Assert.Equal(expected, Texts(new SiteContentTexts { Design = design }).Design);

    [Theory]
    [InlineData("comic-sans")]
    [InlineData("playfair")]
    public void UnknownFont_Throws(string font)
        => Assert.Throws<DomainException>(() => Texts(new SiteContentTexts { Font = font }));

    [Fact]
    public void Font_IsNormalized_AndNullKeepsIt()
    {
        SiteContent c = Texts(new SiteContentTexts { Font = " Playfair-Inter " });
        Assert.Equal("playfair-inter", c.Font);
        c = c.WithTexts(new SiteContentTexts { Font = null }, Year);
        Assert.Equal("playfair-inter", c.Font);
        c = c.WithTexts(new SiteContentTexts { Font = "" }, Year);
        Assert.Equal(string.Empty, c.Font);
    }

    [Fact]
    public void UnknownAmenity_Throws()
        => Assert.Throws<DomainException>(() => Texts(new SiteContentTexts { Amenities = ["havuz"] }));

    [Theory]
    [InlineData(0.9)]
    [InlineData(5.1)]
    public void RatingOutOfRange_Throws(double rating)
        => Assert.Throws<DomainException>(() => Texts(new SiteContentTexts { Rating = (decimal)rating }));

    [Fact]
    public void MoreThanThreeReviews_Throws()
    {
        var reviews = Enumerable.Range(0, 4).Select(i => new SiteReview($"Kişi {i}", "Çok güzel.", "Google")).ToList();
        Assert.Throws<DomainException>(() => Texts(new SiteContentTexts { FeaturedReviews = reviews }));
    }

    [Fact]
    public void EmptyReviewRows_AreDropped_ButHalfFilledThrows()
    {
        SiteContent c = Texts(new SiteContentTexts { FeaturedReviews = [new("", "", ""), new("Elif K.", "Avlu harika.", "Google")] });
        Assert.Single(c.FeaturedReviews);

        Assert.Throws<DomainException>(() => c.WithTexts(new SiteContentTexts { FeaturedReviews = [new("Elif K.", "", "Google")] }, Year));
    }

    [Fact]
    public void ValuesAndMilestones_AreLimited_AndMilestonesSortedByYear()
    {
        SiteContent c = Texts(new SiteContentTexts
        {
            Values = [new("Her sabah zırh", "Kıyma günlük."), new("Meşe kömürü", "")],
            Milestones = [new(2019, "Moda'ya taşındık."), new(1987, "Açıldık.")],
            FoundedYear = 1987,
        });

        Assert.Equal(2, c.Values.Count);
        Assert.Equal([1987, 2019], c.Milestones.Select(m => m.Year));
        Assert.Equal(1987, c.FoundedYear);

        var four = Enumerable.Range(0, 4).Select(i => new SiteValue($"Değer {i}", "")).ToList();
        Assert.Throws<DomainException>(() => Texts(new SiteContentTexts { Values = four }));
        var six = Enumerable.Range(0, 6).Select(i => new SiteMilestone(2000 + i, "Satır")).ToList();
        Assert.Throws<DomainException>(() => Texts(new SiteContentTexts { Milestones = six }));
        Assert.Throws<DomainException>(() => Texts(new SiteContentTexts { FoundedYear = Year + 1 }));
    }

    [Theory]
    [InlineData("0532 000 48 48", true)]
    [InlineData("+90 532 000 48 48", true)]
    [InlineData("whatsapp", false)]
    [InlineData("12345", false)]
    public void BranchWhatsappPhone_IsValidated(string phone, bool valid)
    {
        Branch branch = NewBranch();
        void Act() => SetInfo(branch, whatsapp: phone);
        if (valid) { Act(); Assert.Equal(phone, branch.GetSiteContent().WhatsappPhone); }
        else Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void ReviewsUrl_MustBeHttps()
        => Assert.Throws<DomainException>(() => Texts(new SiteContentTexts { ReviewsUrl = "http://maps.google.com" }));

    [Fact]
    public void TextUpdate_KeepsPhotos()
    {
        Guid region = Guid.NewGuid();
        SiteContent c = SiteContent.Empty
            .WithGalleryImage("site/a.webp")
            .WithFounderPhoto("site/usta.webp", out _)
            .WithRegionPhoto(region, "site/avlu.webp", out _);

        c = c.WithTexts(new SiteContentTexts
        {
            FounderName = "Hasan Narlı",
            RegionDescriptions = new Dictionary<Guid, string> { [region] = "Asma altında 6 masa." },
        }, Year);

        Assert.Equal(["site/a.webp"], c.GalleryImages);
        Assert.Equal("site/usta.webp", c.FounderPhoto);
        SiteRegionDetail detail = Assert.Single(c.RegionDetails);
        Assert.Equal("site/avlu.webp", detail.PhotoKey);
        Assert.Equal("Asma altında 6 masa.", detail.Description);

        // Açıklaması gönderilmeyen bölüm fotoğrafıyla kalır.
        c = c.WithTexts(new SiteContentTexts(), Year);
        Assert.Equal("site/avlu.webp", Assert.Single(c.RegionDetails).PhotoKey);
    }

    [Fact]
    public void Gallery_AcceptsAtMostTwelve_AndReorders()
    {
        SiteContent c = SiteContent.Empty;
        for (int i = 0; i < SiteContent.GalleryMax; i++) c = c.WithGalleryImage($"site/{i}.webp");

        SiteContent full = c;
        Assert.Throws<DomainException>(() => full.WithGalleryImage("site/fazla.webp"));

        c = c.WithoutGalleryImage(0, out string removed);
        Assert.Equal("site/0.webp", removed);
        Assert.Equal(11, c.GalleryImages.Count);

        List<int> order = Enumerable.Range(0, 11).Reverse().ToList();
        c = c.WithGalleryOrder(order);
        Assert.Equal("site/11.webp", c.GalleryImages[0]);

        SiteContent ordered = c;
        Assert.Throws<DomainException>(() => ordered.WithGalleryOrder([0, 0, 1]));
        Assert.Throws<DomainException>(() => ordered.WithoutGalleryImage(99, out _));
    }

    [Fact]
    public void WeeklyHours_MustHaveSevenDistinctDays_AndOneOpen()
    {
        Branch branch = NewBranch();
        Assert.Throws<DomainException>(() => SetInfo(branch, Week().Take(6).ToList()));
        Assert.Throws<DomainException>(() => SetInfo(branch, Week(closed: [.. SiteContent.WeekOrder])));
    }

    [Fact]
    public void WeeklyHours_SetLegacyRangeToMostCommon()
    {
        Branch branch = NewBranch();
        List<SiteDayHours> week = Week("09:00", "23:30");
        week[4] = new SiteDayHours(DayOfWeek.Friday, true, new TimeOnly(9, 0), new TimeOnly(0, 30));

        SetInfo(branch, week);

        Assert.Equal(new TimeOnly(9, 0), branch.OpensAt);
        Assert.Equal(new TimeOnly(23, 30), branch.ClosesAt);
        Assert.Equal(DayOfWeek.Monday, branch.GetSiteContent().WeeklyHours[0].Day);
    }

    [Fact]
    public void EmptyWeek_KeepsSingleRange_AndHalfRangeThrows()
    {
        Branch branch = NewBranch();
        SetInfo(branch, opens: new TimeOnly(11, 0), closes: new TimeOnly(22, 0), hoursNote: "  Pazartesi kapalı. ");

        Assert.Equal(new TimeOnly(11, 0), branch.OpensAt);
        Assert.Equal(new TimeOnly(22, 0), branch.ClosesAt);
        Assert.Equal("Pazartesi kapalı.", branch.HoursNote);
        Assert.Throws<DomainException>(() => SetInfo(branch, opens: new TimeOnly(11, 0)));
    }

    [Fact]
    public void SiteFor_AddsBranchInfo_ToCompanySite()
    {
        Branch branch = NewBranch();
        SetInfo(branch, opens: new TimeOnly(11, 0), closes: new TimeOnly(22, 0), whatsapp: "0532 000 48 48", directions: "Metroya 4 dk", hoursNote: "Not");
        SiteSnapshot site = SiteSnapshot.Empty with { Headline = "Ocak", Content = SiteContent.Empty with { Theme = "bordo" } };

        SiteSnapshot view = branch.SiteFor(site);

        Assert.Equal("Ocak", view.Headline);
        Assert.Equal("bordo", view.Content.Theme);
        Assert.Equal(new TimeOnly(11, 0), view.OpensAt);
        Assert.Equal("Not", view.HoursNote);
        Assert.Equal("0532 000 48 48", view.Content.WhatsappPhone);
        Assert.Equal("Metroya 4 dk", view.Content.DirectionsNote);
        // Şirketin sitesinde saklanırken şubeye ait alanlar boşalır.
        SiteSnapshot stored = view.WithoutBranchInfo();
        Assert.Null(stored.OpensAt);
        Assert.Equal(string.Empty, stored.Content.WhatsappPhone);
        Assert.Equal("bordo", stored.Content.Theme);
    }

    [Fact]
    public void ResetSiteInfo_ClearsWhatsappAndDirections_KeepsHours()
    {
        Branch branch = NewBranch();
        SetInfo(branch, Week(), whatsapp: "0532 000 48 48", directions: "Metroya 4 dk");

        branch.ResetSiteInfo();

        Assert.Equal(string.Empty, branch.GetSiteContent().WhatsappPhone);
        Assert.Equal(string.Empty, branch.GetSiteContent().DirectionsNote);
        Assert.Equal(7, branch.GetSiteContent().WeeklyHours.Count);
    }

    // 16 Kasım 2026 Pazartesi.
    [Theory]
    [InlineData("2026-11-16 12:30", true)]   // Pazartesi, açık
    [InlineData("2026-11-16 08:59", false)]  // Pazartesi, açılmadan
    [InlineData("2026-11-22 12:00", false)]  // Pazar kapalı
    [InlineData("2026-11-21 01:30", true)]   // Cumartesi gece: Cuma 18:00–02:00 aralığı sürüyor
    [InlineData("2026-11-21 02:00", false)]  // Cumartesi 02:00: Cuma aralığı bitti, Cumartesi henüz açılmadı
    [InlineData("2026-11-20 19:00", true)]   // Cuma akşam
    public void IsOpenAt_UsesWeeklyHours_IncludingOvernight(string local, bool expected)
    {
        Branch branch = NewBranch();
        List<SiteDayHours> week = Week("09:00", "23:00", DayOfWeek.Sunday);
        week[4] = new SiteDayHours(DayOfWeek.Friday, true, new TimeOnly(18, 0), new TimeOnly(2, 0));
        SetInfo(branch, week);

        Assert.Equal(expected, branch.IsOpenAt(DateTime.Parse(local, System.Globalization.CultureInfo.InvariantCulture)));
    }

    [Fact]
    public void IsOpenAt_FallsBackToSingleRange_ThenNull()
    {
        Branch branch = NewBranch();
        Assert.Null(branch.IsOpenAt(new DateTime(2026, 11, 16, 12, 0, 0)));

        SetInfo(branch, opens: new TimeOnly(18, 0), closes: new TimeOnly(2, 0));
        Assert.True(branch.IsOpenAt(new DateTime(2026, 11, 16, 1, 0, 0)));
        Assert.False(branch.IsOpenAt(new DateTime(2026, 11, 16, 12, 0, 0)));
    }
}
