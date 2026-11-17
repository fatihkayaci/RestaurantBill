using FluentValidation.TestHelper;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Features.Branches.Site;
using RestaurantBill.Application.Features.CustomerSite.Public;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.CustomerSite;

// Admin "Restoran sitesi": ek içerik (tema, galeri, haftalık saat, usta, yorumlar, bölüm fotoğrafı), doğrulama,
// "Sitenizi güzelleştirin" puanı ve müşteri sitesine yansıması.
public class SiteContentHandlerTests : ApplicationTestBase
{
    private const string Slug = "narli-ev";

    private readonly FakeTenantResolver _tenant = new() { Slug = Slug };
    private readonly FakeImageStorageService _storage = new() { NextKey = "site/yeni.webp" };
    private static readonly IOptions<BunnyStorageOptions> Cdn = Options.Create(new BunnyStorageOptions { CdnBaseUrl = "https://cdn.test/" });

    private Branch _branch = default!;
    private Region _salon = default!;

    private async Task SeedAsync(bool withMenu = true)
    {
        User owner = await SeedActorAsync();
        Company company = Company.Create("Narlı Ev", owner);
        company.Slug = Slug;
        DbContext.Companies.Add(company);
        await DbContext.SaveChangesAsync();

        _branch = Branch.Create(company.Id, "Moda", "", "", "", "İstanbul", "Kadıköy", "Moda Cd. No: 48", 10m);
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(_branch, CurrentUser.BranchId);
        DbContext.Branches.Add(_branch);
        await DbContext.SaveChangesAsync();

        _salon = await SeedRegionAsync();
        DbContext.Tables.Add(Table.Create("Masa 1", "", _salon.Id));
        if (withMenu)
        {
            Guid category = await DefaultCategoryIdAsync();
            DbContext.Products.Add(Product.Create("Adana Kebap", 520m, "products/adana.webp", category));
            DbContext.Products.Add(Product.Create("Ayran", 40m, "", category));
        }
        await DbContext.SaveChangesAsync();
    }

    private static UpdateBranchSiteCommand FullCommand(Guid regionId) => new()
    {
        Headline = "Avlulu bir taş evde.",
        StoryTitle = "Üç kuşaktır aynı ocağın başındayız.",
        About = "1987'de açıldık.",
        InstagramUrl = "https://instagram.com/narliev",
        Theme = "bordo",
        WeeklyHours = [.. new[] { 1, 2, 3, 4, 5, 6, 0 }.Select(d => new SiteDayHoursDto { Day = d, IsOpen = d != 0, Opens = "09:00", Closes = "23:30" })],
        DirectionsNote = "Kadıköy iskelesinden 12 dk yürüme.",
        WhatsappPhone = "0532 000 48 48",
        Amenities = ["avlu", "vale"],
        Rating = 4.7m,
        ReviewCount = 1240,
        ReviewsUrl = "https://maps.google.com/?cid=1",
        FeaturedReviews = [new SiteReviewDto { Author = "Elif K.", Text = "Avlu akşamları ayrı güzel.", Source = "Google" }],
        FounderName = "Hasan Narlı",
        FounderTitle = "Usta, ikinci kuşak",
        FounderQuote = "Zırhın sesi bu dükkânın sesi.",
        FoundedYear = 1987,
        Values = [new SiteValueDto { Title = "Her sabah zırh", Text = "Kıyma günlük, el ile çekilir." }],
        Milestones = [new SiteMilestoneDto { Year = 2019, Text = "Moda'ya taşındık." }, new SiteMilestoneDto { Year = 1987, Text = "Açıldık." }],
        RegionDetails = [new SiteRegionDetailDto { RegionId = regionId, Description = "Ocak başına bakan masalar." }, new SiteRegionDetailDto { RegionId = Guid.NewGuid(), Description = "Başka şube" }],
    };

    private Task<Domain.Shared.Result<BranchSiteDto>> UpdateAsync(UpdateBranchSiteCommand command)
        => new UpdateBranchSiteCommandHandler(Db, CurrentUser, Cdn).Handle(command, CancellationToken.None);

    [Fact]
    public async Task Update_SavesAllFields_AndGetReturnsThem()
    {
        await SeedAsync();

        var saved = await UpdateAsync(FullCommand(_salon.Id));
        Assert.True(saved.IsSuccess, saved.Error);

        var result = await new GetBranchSiteQueryHandler(Db, CurrentUser, Cdn).Handle(new GetBranchSiteQuery(), CancellationToken.None);
        BranchSiteDto site = result.Value!;
        Assert.Equal("bordo", site.Theme);
        Assert.Equal(7, site.WeeklyHours.Count);
        Assert.Equal(1, site.WeeklyHours[0].Day); // Pazartesi başta
        Assert.False(site.WeeklyHours.Single(d => d.Day == 0).IsOpen);
        Assert.Equal("09:00", site.OpensAt); // eski tek aralık en sık aralıkla güncellendi
        Assert.Equal("23:30", site.ClosesAt);
        Assert.Equal(["avlu", "vale"], site.Amenities);
        Assert.Equal(4.7m, site.Rating);
        Assert.Equal("Elif K.", Assert.Single(site.FeaturedReviews).Author);
        Assert.Equal("Hasan Narlı", site.FounderName);
        Assert.Equal(1987, site.FoundedYear);
        Assert.Equal([1987, 2019], site.Milestones.Select(m => m.Year));
        // Admin şeklinde şubenin bütün bölümleri var; başka şubenin bölüm kimliği yok sayıldı.
        SiteRegionDetailDto region = Assert.Single(site.RegionDetails);
        Assert.Equal("Salon", region.Name);
        Assert.Equal(1, region.TableCount);
        Assert.Equal("Ocak başına bakan masalar.", region.Description);
    }

    [Fact]
    public async Task Update_DomainError_ReturnsFailure_AndDoesNotSave()
    {
        await SeedAsync();
        UpdateBranchSiteCommand command = FullCommand(_salon.Id);
        command.Amenities = ["havuz"];

        var result = await UpdateAsync(command);

        Assert.False(result.IsSuccess);
        Assert.Contains("hazır listeden", result.Error);
        Assert.Null((await DbContext.Branches.FindAsync(_branch.Id))!.SiteContent);
    }

    [Fact]
    public void Validator_RejectsLimits()
    {
        var validator = new UpdateBranchSiteCommandValidator();
        var command = new UpdateBranchSiteCommand
        {
            Theme = "pembe",
            Rating = 6,
            WeeklyHours = [new SiteDayHoursDto { Day = 1, IsOpen = true, Opens = "9", Closes = "23:00" }],
            FeaturedReviews = [.. Enumerable.Range(0, 4).Select(_ => new SiteReviewDto { Author = "A", Text = "B" })],
            Values = [.. Enumerable.Range(0, 4).Select(_ => new SiteValueDto { Title = "A" })],
            Milestones = [.. Enumerable.Range(0, 6).Select(i => new SiteMilestoneDto { Year = 2000 + i, Text = "A" })],
            Amenities = ["havuz"],
            DirectionsNote = new string('a', SiteContent.DirectionsNoteMaxLength + 1),
            FounderQuote = new string('a', SiteContent.FounderQuoteMaxLength + 1),
        };

        var result = validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor(x => x.Theme);
        result.ShouldHaveValidationErrorFor(x => x.Rating);
        result.ShouldHaveValidationErrorFor(x => x.WeeklyHours);
        result.ShouldHaveValidationErrorFor("WeeklyHours[0].Opens");
        result.ShouldHaveValidationErrorFor(x => x.FeaturedReviews.Count);
        result.ShouldHaveValidationErrorFor(x => x.Values.Count);
        result.ShouldHaveValidationErrorFor(x => x.Milestones.Count);
        result.ShouldHaveValidationErrorFor("Amenities[0]");
        result.ShouldHaveValidationErrorFor(x => x.DirectionsNote);
        result.ShouldHaveValidationErrorFor(x => x.FounderQuote);
    }

    [Fact]
    public void Validator_HiddenFaqs_RejectsBadKeysAndTooMany_AcceptsSlugsAndNull()
    {
        var validator = new UpdateBranchSiteCommandValidator();

        var bad = validator.TestValidate(new UpdateBranchSiteCommand { HiddenFaqs = ["rezervasyon", "Ödeme yolu!", new string('a', 41)] });
        bad.ShouldHaveValidationErrorFor("HiddenFaqs[1]");
        bad.ShouldHaveValidationErrorFor("HiddenFaqs[2]");
        bad.ShouldNotHaveValidationErrorFor("HiddenFaqs[0]");

        var many = validator.TestValidate(new UpdateBranchSiteCommand { HiddenFaqs = [.. Enumerable.Range(0, SiteContent.HiddenFaqsMax + 1).Select(i => $"soru-{i}")] });
        many.ShouldHaveValidationErrorFor("HiddenFaqs.Count");

        validator.TestValidate(new UpdateBranchSiteCommand { HiddenFaqs = ["rezervasyon-sorgula", "otopark", "teslimat-bolgeleri"] }).ShouldNotHaveAnyValidationErrors();
        validator.TestValidate(new UpdateBranchSiteCommand { HiddenFaqs = null }).ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("pembe")]
    [InlineData("tema2")]
    [InlineData("renkli-sade")]
    public void Validator_Design_RejectsUnknownKey(string design)
        => new UpdateBranchSiteCommandValidator()
            .TestValidate(new UpdateBranchSiteCommand { Design = design })
            .ShouldHaveValidationErrorFor(x => x.Design);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("renkli")]
    [InlineData("sade")]
    [InlineData(" Sade ")]
    public void Validator_Design_AcceptsKnownEmptyAndNull(string? design)
        => new UpdateBranchSiteCommandValidator()
            .TestValidate(new UpdateBranchSiteCommand { Design = design })
            .ShouldNotHaveAnyValidationErrors();

    [Fact]
    public async Task Update_Design_NormalizedAndKeptWhenOldFormOmitsIt()
    {
        await SeedAsync();
        UpdateBranchSiteCommand command = FullCommand(_salon.Id);
        command.Design = " SADE ";
        var first = await UpdateAsync(command);
        Assert.True(first.IsSuccess, first.Error);
        Assert.Equal("sade", first.Value!.Design);

        // Eski form alanı göndermez (null): tasarım korunur.
        command.Design = null;
        var second = await UpdateAsync(command);
        Assert.True(second.IsSuccess, second.Error);
        Assert.Equal("sade", second.Value!.Design);

        var site = await new GetPublicSiteQueryHandler(Db, _tenant, Cdn).Handle(new GetPublicSiteQuery(), CancellationToken.None);
        Assert.True(site.IsSuccess, site.Error);
        Assert.Equal("sade", site.Value!.Site.Design);

        // Boş = varsayılana (renkli) döner.
        command.Design = "";
        var third = await UpdateAsync(command);
        Assert.True(third.IsSuccess, third.Error);
        Assert.Equal(string.Empty, third.Value!.Design);
    }

    [Fact]
    public void Validator_AcceptsNewAmenityKeys()
        => new UpdateBranchSiteCommandValidator()
            .TestValidate(new UpdateBranchSiteCommand { Amenities = ["bebek-sandalyesi", "aile-salonu", "sigara-alani", "ozel-gun"] })
            .ShouldNotHaveAnyValidationErrors();

    [Fact]
    public async Task Update_NewAmenities_KeptInFixedOrder_AndOldFormKeepsHiddenFaqs()
    {
        await SeedAsync();
        UpdateBranchSiteCommand command = FullCommand(_salon.Id);
        command.Amenities = ["ozel-gun", "otopark", "bebek-sandalyesi", "sigara-alani", "aile-salonu"];
        command.HiddenFaqs = ["Otopark", "odeme", "otopark"];

        var first = await UpdateAsync(command);
        Assert.True(first.IsSuccess, first.Error);
        Assert.Equal(["otopark", "bebek-sandalyesi", "aile-salonu", "sigara-alani", "ozel-gun"], first.Value!.Amenities);
        // Küçük harfe çevrilir, tekrar atılır, sıra korunur.
        Assert.Equal(["otopark", "odeme"], first.Value.HiddenFaqs);

        // Eski form alanı göndermez (null): gizlenenler korunur.
        command.HiddenFaqs = null;
        var second = await UpdateAsync(command);
        Assert.True(second.IsSuccess, second.Error);
        Assert.Equal(["otopark", "odeme"], second.Value!.HiddenFaqs);

        var site = await new GetPublicSiteQueryHandler(Db, _tenant, Cdn).Handle(new GetPublicSiteQuery(), CancellationToken.None);
        Assert.True(site.IsSuccess, site.Error);
        Assert.Equal(["otopark", "odeme"], site.Value!.Site.HiddenFaqs);
    }

    [Fact]
    public void Validator_AcceptsEmptyCommand()
        => new UpdateBranchSiteCommandValidator().TestValidate(new UpdateBranchSiteCommand()).ShouldNotHaveAnyValidationErrors();

    [Fact]
    public async Task Gallery_AddRemoveReorder_AndTwelfthIsLast()
    {
        await SeedAsync();
        var add = new AddSiteGalleryImageCommandHandler(Db, CurrentUser, _storage, Cdn);

        for (int i = 0; i < SiteContent.GalleryMax; i++)
        {
            _storage.NextKey = $"site/{i}.webp";
            var r = await add.Handle(new AddSiteGalleryImageCommand { Content = new MemoryStream([1]) }, CancellationToken.None);
            Assert.True(r.IsSuccess, r.Error);
        }
        Assert.Equal("site", _storage.LastFolder);

        int uploadsBefore = _storage.UploadedKeys.Count;
        var full = await add.Handle(new AddSiteGalleryImageCommand { Content = new MemoryStream([1]) }, CancellationToken.None);
        Assert.False(full.IsSuccess);
        Assert.Equal(uploadsBefore, _storage.UploadedKeys.Count); // dolu galeriye dosya yüklenmedi

        var removed = await new RemoveSiteGalleryImageCommandHandler(Db, CurrentUser, _storage, Cdn)
            .Handle(new RemoveSiteGalleryImageCommand { Index = 0 }, CancellationToken.None);
        Assert.True(removed.IsSuccess, removed.Error);
        Assert.Contains("site/0.webp", _storage.DeletedKeys);
        Assert.Equal(11, removed.Value!.GalleryImageUrls.Count);
        Assert.Equal("https://cdn.test/site/1.webp", removed.Value.GalleryImageUrls[0]);

        var reordered = await new ReorderSiteGalleryCommandHandler(Db, CurrentUser, Cdn)
            .Handle(new ReorderSiteGalleryCommand { Order = [.. Enumerable.Range(0, 11).Reverse()] }, CancellationToken.None);
        Assert.True(reordered.IsSuccess, reordered.Error);
        Assert.Equal("https://cdn.test/site/11.webp", reordered.Value!.GalleryImageUrls[0]);

        var bad = await new ReorderSiteGalleryCommandHandler(Db, CurrentUser, Cdn)
            .Handle(new ReorderSiteGalleryCommand { Order = [0, 1] }, CancellationToken.None);
        Assert.False(bad.IsSuccess);
    }

    [Fact]
    public async Task FounderPhoto_UploadsAndReplaces()
    {
        await SeedAsync();
        var handler = new SetBranchSiteImageCommandHandler(Db, CurrentUser, _storage, Cdn);

        _storage.NextKey = "site/usta-1.webp";
        await handler.Handle(new SetBranchSiteImageCommand { Slot = SiteImageSlot.Founder, Content = new MemoryStream([1]) }, CancellationToken.None);
        _storage.NextKey = "site/usta-2.webp";
        var result = await handler.Handle(new SetBranchSiteImageCommand { Slot = SiteImageSlot.Founder, Content = new MemoryStream([1]) }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal("https://cdn.test/site/usta-2.webp", result.Value!.FounderPhotoUrl);
        Assert.Contains("site/usta-1.webp", _storage.DeletedKeys);
        Assert.Equal(1000, _storage.LastMaxSize);
    }

    [Fact]
    public async Task RegionPhoto_OnlyForOwnRegion_AndShowsOnPublicSite()
    {
        await SeedAsync();
        var handler = new SetSiteRegionImageCommandHandler(Db, CurrentUser, _storage, Cdn);

        var foreign = await handler.Handle(new SetSiteRegionImageCommand { RegionId = Guid.NewGuid(), Content = new MemoryStream([1]) }, CancellationToken.None);
        Assert.False(foreign.IsSuccess);

        _storage.NextKey = "site/salon.webp";
        var ok = await handler.Handle(new SetSiteRegionImageCommand { RegionId = _salon.Id, Content = new MemoryStream([1]) }, CancellationToken.None);
        Assert.True(ok.IsSuccess, ok.Error);
        await UpdateAsync(FullCommand(_salon.Id));

        var site = await new GetPublicSiteQueryHandler(Db, _tenant, Cdn).Handle(new GetPublicSiteQuery(), CancellationToken.None);
        Assert.True(site.IsSuccess, site.Error);
        PublicRegionDto region = Assert.Single(site.Value!.Regions);
        Assert.Equal("https://cdn.test/site/salon.webp", region.PhotoUrl);
        Assert.Equal("Ocak başına bakan masalar.", region.Description);
        Assert.Equal("bordo", site.Value.Site.Theme);
        Assert.Empty(site.Value.Site.RegionDetails); // sitede bölüm bilgisi regions[] içinde

        var removed = await handler.Handle(new SetSiteRegionImageCommand { RegionId = _salon.Id, Content = null }, CancellationToken.None);
        Assert.Equal(string.Empty, Assert.Single(removed.Value!.RegionDetails).PhotoUrl);
        Assert.Contains("site/salon.webp", _storage.DeletedKeys);
    }

    [Fact]
    public async Task PublicSite_OldRestaurant_HasDefaultThemeAndToday()
    {
        await SeedAsync();

        var site = await new GetPublicSiteQueryHandler(Db, _tenant, Cdn).Handle(new GetPublicSiteQuery(), CancellationToken.None);

        Assert.True(site.IsSuccess, site.Error);
        Assert.Equal(string.Empty, site.Value!.Site.Theme); // boş = varsayılan terracotta (ön yüz)
        Assert.Empty(site.Value.Site.WeeklyHours);
        Assert.Null(site.Value.IsOpenNow);
        Assert.InRange(site.Value.Today, 0, 6);
    }

    [Fact]
    public async Task Completeness_EmptySite_IsLow_AndOrderedByImpact()
    {
        await SeedAsync();

        var result = await new GetSiteCompletenessQueryHandler(Db, CurrentUser).Handle(new GetSiteCompletenessQuery(), CancellationToken.None);

        SiteCompletenessDto c = result.Value!;
        Assert.InRange(c.Score, 0, 20);
        Assert.Equal("cover", c.Items[0].Key);
        Assert.Equal("productPhotos", c.Items[1].Key);
        Assert.Equal(2, c.TotalProducts);
        Assert.Equal(1, c.ProductsWithoutPhoto);
        Assert.Equal("1 ürün fotoğrafsız", c.Items[1].Detail);
        Assert.Equal(0.5, c.Items[1].Progress);
        Assert.True(c.Items.SequenceEqual(c.Items.OrderByDescending(i => i.Weight)));
        Assert.All(c.Items, i => Assert.False(string.IsNullOrWhiteSpace(i.Reason)));
    }

    [Fact]
    public async Task Completeness_FullSite_Is100()
    {
        await SeedAsync(withMenu: false);
        Guid category = await DefaultCategoryIdAsync();
        DbContext.Products.Add(Product.Create("Adana Kebap", 520m, "products/adana.webp", category));
        _branch.UpdateSite("Başlık", "Alt", "Hikâye başlığı", "Hikâye", null, null, "", "https://instagram.com/narliev", "");
        _branch.ReplaceSiteImage(SiteImageSlot.Cover, "site/kapak.webp");
        _branch.ReplaceSiteImage(SiteImageSlot.About, "site/hikaye.webp");
        _branch.ReplaceSiteImage(SiteImageSlot.Founder, "site/usta.webp");
        for (int i = 0; i < 3; i++) _branch.AddSiteGalleryImage($"site/g{i}.webp");
        _branch.ReplaceSiteRegionPhoto(_salon.Id, "site/salon.webp");
        await DbContext.SaveChangesAsync();
        await UpdateAsync(FullCommand(_salon.Id));

        var result = await new GetSiteCompletenessQueryHandler(Db, CurrentUser).Handle(new GetSiteCompletenessQuery(), CancellationToken.None);

        Assert.Equal(100, result.Value!.Score);
        Assert.All(result.Value.Items, i => Assert.True(i.Done, i.Key));
    }

    [Fact]
    public async Task Completeness_NoProducts_AsksToAddProducts()
    {
        await SeedAsync(withMenu: false);

        var result = await new GetSiteCompletenessQueryHandler(Db, CurrentUser).Handle(new GetSiteCompletenessQuery(), CancellationToken.None);

        SiteChecklistItemDto item = result.Value!.Items.Single(i => i.Key == "productPhotos");
        Assert.Equal("Menüye ürün ekleyin", item.Title);
        Assert.False(item.Done);
    }
}
