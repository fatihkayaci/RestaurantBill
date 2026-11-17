using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

// Restoran sitesinin ek içeriği: doğrulama sınırları, fotoğrafların korunması, haftalık saat ve "şu an açık".
public class SiteContentTests
{
    private const int Year = 2026;

    private static Branch NewBranch() => Branch.Create(Guid.NewGuid(), "Merkez", "", "", "", "İstanbul", "Kadıköy", "", 10m);

    private static List<SiteDayHours> Week(string opens = "09:00", string closes = "23:00", params DayOfWeek[] closed)
        => SiteContent.WeekOrder.Select(d => new SiteDayHours(d, !closed.Contains(d), TimeOnly.Parse(opens), TimeOnly.Parse(closes))).ToList();

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
        Branch branch = NewBranch();

        branch.UpdateSiteContent(new SiteContentTexts
        {
            Theme = " Zeytin ",
            Amenities = ["wifi", "AVLU", "wifi"],
            DirectionsNote = "  Metroya 4 dk  ",
            Rating = 4.66m,
            ReviewCount = 1240,
        }, Year);

        SiteContent c = branch.GetSiteContent();
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
        => Assert.Throws<DomainException>(() => NewBranch().UpdateSiteContent(new SiteContentTexts { Theme = theme }, Year));

    [Theory]
    [InlineData("pembe")]
    [InlineData("tema2")]
    public void UnknownDesign_Throws(string design)
        => Assert.Throws<DomainException>(() => NewBranch().UpdateSiteContent(new SiteContentTexts { Design = design }, Year));

    [Theory]
    [InlineData("renkli", "renkli")]
    [InlineData("sade", "sade")]
    [InlineData(" Elit ", "elit")]
    public void KnownDesign_IsNormalized(string design, string expected)
    {
        Branch branch = NewBranch();
        branch.UpdateSiteContent(new SiteContentTexts { Design = design }, Year);
        Assert.Equal(expected, branch.GetSiteContent().Design);
    }

    [Theory]
    [InlineData("comic-sans")]
    [InlineData("playfair")]
    public void UnknownFont_Throws(string font)
        => Assert.Throws<DomainException>(() => NewBranch().UpdateSiteContent(new SiteContentTexts { Font = font }, Year));

    [Fact]
    public void Font_IsNormalized_AndNullKeepsIt()
    {
        Branch branch = NewBranch();
        branch.UpdateSiteContent(new SiteContentTexts { Font = " Playfair-Inter " }, Year);
        Assert.Equal("playfair-inter", branch.GetSiteContent().Font);
        branch.UpdateSiteContent(new SiteContentTexts { Font = null }, Year);
        Assert.Equal("playfair-inter", branch.GetSiteContent().Font);
        branch.UpdateSiteContent(new SiteContentTexts { Font = "" }, Year);
        Assert.Equal(string.Empty, branch.GetSiteContent().Font);
    }

    [Fact]
    public void UnknownAmenity_Throws()
        => Assert.Throws<DomainException>(() => NewBranch().UpdateSiteContent(new SiteContentTexts { Amenities = ["havuz"] }, Year));

    [Theory]
    [InlineData(0.9)]
    [InlineData(5.1)]
    public void RatingOutOfRange_Throws(double rating)
        => Assert.Throws<DomainException>(() => NewBranch().UpdateSiteContent(new SiteContentTexts { Rating = (decimal)rating }, Year));

    [Fact]
    public void MoreThanThreeReviews_Throws()
    {
        var reviews = Enumerable.Range(0, 4).Select(i => new SiteReview($"Kişi {i}", "Çok güzel.", "Google")).ToList();
        Assert.Throws<DomainException>(() => NewBranch().UpdateSiteContent(new SiteContentTexts { FeaturedReviews = reviews }, Year));
    }

    [Fact]
    public void EmptyReviewRows_AreDropped_ButHalfFilledThrows()
    {
        Branch branch = NewBranch();
        branch.UpdateSiteContent(new SiteContentTexts { FeaturedReviews = [new("", "", ""), new("Elif K.", "Avlu harika.", "Google")] }, Year);
        Assert.Single(branch.GetSiteContent().FeaturedReviews);

        Assert.Throws<DomainException>(() => branch.UpdateSiteContent(new SiteContentTexts { FeaturedReviews = [new("Elif K.", "", "Google")] }, Year));
    }

    [Fact]
    public void ValuesAndMilestones_AreLimited_AndMilestonesSortedByYear()
    {
        Branch branch = NewBranch();
        branch.UpdateSiteContent(new SiteContentTexts
        {
            Values = [new("Her sabah zırh", "Kıyma günlük."), new("Meşe kömürü", "")],
            Milestones = [new(2019, "Moda'ya taşındık."), new(1987, "Açıldık.")],
            FoundedYear = 1987,
        }, Year);

        SiteContent c = branch.GetSiteContent();
        Assert.Equal(2, c.Values.Count);
        Assert.Equal([1987, 2019], c.Milestones.Select(m => m.Year));
        Assert.Equal(1987, c.FoundedYear);

        var four = Enumerable.Range(0, 4).Select(i => new SiteValue($"Değer {i}", "")).ToList();
        Assert.Throws<DomainException>(() => branch.UpdateSiteContent(new SiteContentTexts { Values = four }, Year));
        var six = Enumerable.Range(0, 6).Select(i => new SiteMilestone(2000 + i, "Satır")).ToList();
        Assert.Throws<DomainException>(() => branch.UpdateSiteContent(new SiteContentTexts { Milestones = six }, Year));
        Assert.Throws<DomainException>(() => branch.UpdateSiteContent(new SiteContentTexts { FoundedYear = Year + 1 }, Year));
    }

    [Theory]
    [InlineData("0532 000 48 48", true)]
    [InlineData("+90 532 000 48 48", true)]
    [InlineData("whatsapp", false)]
    [InlineData("12345", false)]
    public void WhatsappPhone_IsValidated(string phone, bool valid)
    {
        Branch branch = NewBranch();
        void Act() => branch.UpdateSiteContent(new SiteContentTexts { WhatsappPhone = phone }, Year);
        if (valid) { Act(); Assert.Equal(phone, branch.GetSiteContent().WhatsappPhone); }
        else Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void ReviewsUrl_MustBeHttps()
        => Assert.Throws<DomainException>(() => NewBranch().UpdateSiteContent(new SiteContentTexts { ReviewsUrl = "http://maps.google.com" }, Year));

    [Fact]
    public void TextUpdate_KeepsPhotos()
    {
        Branch branch = NewBranch();
        Guid region = Guid.NewGuid();
        branch.AddSiteGalleryImage("site/a.webp");
        branch.ReplaceSiteImage(SiteImageSlot.Founder, "site/usta.webp");
        branch.ReplaceSiteRegionPhoto(region, "site/avlu.webp");

        branch.UpdateSiteContent(new SiteContentTexts
        {
            FounderName = "Hasan Narlı",
            RegionDescriptions = new Dictionary<Guid, string> { [region] = "Asma altında 6 masa." },
        }, Year);

        SiteContent c = branch.GetSiteContent();
        Assert.Equal(["site/a.webp"], c.GalleryImages);
        Assert.Equal("site/usta.webp", c.FounderPhoto);
        SiteRegionDetail detail = Assert.Single(c.RegionDetails);
        Assert.Equal("site/avlu.webp", detail.PhotoKey);
        Assert.Equal("Asma altında 6 masa.", detail.Description);

        // Açıklaması gönderilmeyen bölüm fotoğrafıyla kalır.
        branch.UpdateSiteContent(new SiteContentTexts(), Year);
        Assert.Equal("site/avlu.webp", Assert.Single(branch.GetSiteContent().RegionDetails).PhotoKey);
    }

    [Fact]
    public void Gallery_AcceptsAtMostTwelve_AndReorders()
    {
        Branch branch = NewBranch();
        for (int i = 0; i < SiteContent.GalleryMax; i++) branch.AddSiteGalleryImage($"site/{i}.webp");

        Assert.Throws<DomainException>(() => branch.AddSiteGalleryImage("site/fazla.webp"));

        string removed = branch.RemoveSiteGalleryImage(0);
        Assert.Equal("site/0.webp", removed);
        Assert.Equal(11, branch.GetSiteContent().GalleryImages.Count);

        List<int> order = Enumerable.Range(0, 11).Reverse().ToList();
        branch.ReorderSiteGallery(order);
        Assert.Equal("site/11.webp", branch.GetSiteContent().GalleryImages[0]);

        Assert.Throws<DomainException>(() => branch.ReorderSiteGallery([0, 0, 1]));
        Assert.Throws<DomainException>(() => branch.RemoveSiteGalleryImage(99));
    }

    [Fact]
    public void WeeklyHours_MustHaveSevenDistinctDays_AndOneOpen()
    {
        Branch branch = NewBranch();
        Assert.Throws<DomainException>(() => branch.UpdateSiteContent(new SiteContentTexts { WeeklyHours = Week().Take(6).ToList() }, Year));
        Assert.Throws<DomainException>(() => branch.UpdateSiteContent(new SiteContentTexts { WeeklyHours = Week(closed: [.. SiteContent.WeekOrder]) }, Year));
    }

    [Fact]
    public void WeeklyHours_SetLegacyRangeToMostCommon()
    {
        Branch branch = NewBranch();
        List<SiteDayHours> week = Week("09:00", "23:30");
        week[4] = new SiteDayHours(DayOfWeek.Friday, true, new TimeOnly(9, 0), new TimeOnly(0, 30));

        branch.UpdateSiteContent(new SiteContentTexts { WeeklyHours = week }, Year);

        Assert.Equal(new TimeOnly(9, 0), branch.OpensAt);
        Assert.Equal(new TimeOnly(23, 30), branch.ClosesAt);
        Assert.Equal(DayOfWeek.Monday, branch.GetSiteContent().WeeklyHours[0].Day);
    }

    [Fact]
    public void EmptyWeek_KeepsSingleRange()
    {
        Branch branch = NewBranch();
        branch.UpdateSite("", "", "", "", new TimeOnly(11, 0), new TimeOnly(22, 0), "", "", "");

        branch.UpdateSiteContent(new SiteContentTexts(), Year);

        Assert.Equal(new TimeOnly(11, 0), branch.OpensAt);
        Assert.Equal(new TimeOnly(22, 0), branch.ClosesAt);
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
        branch.UpdateSiteContent(new SiteContentTexts { WeeklyHours = week }, Year);

        Assert.Equal(expected, branch.IsOpenAt(DateTime.Parse(local, System.Globalization.CultureInfo.InvariantCulture)));
    }

    [Fact]
    public void IsOpenAt_FallsBackToSingleRange_ThenNull()
    {
        Branch branch = NewBranch();
        Assert.Null(branch.IsOpenAt(new DateTime(2026, 11, 16, 12, 0, 0)));

        branch.UpdateSite("", "", "", "", new TimeOnly(18, 0), new TimeOnly(2, 0), "", "", "");
        Assert.True(branch.IsOpenAt(new DateTime(2026, 11, 16, 1, 0, 0)));
        Assert.False(branch.IsOpenAt(new DateTime(2026, 11, 16, 12, 0, 0)));
    }
}
