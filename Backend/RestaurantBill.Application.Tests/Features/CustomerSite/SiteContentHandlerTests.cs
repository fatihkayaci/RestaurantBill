using FluentValidation.TestHelper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Features.Branches.Site;
using RestaurantBill.Application.Features.CustomerSite.Public;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.CustomerSite;

// "Restoran sitesi" (şirket geneli; sahip taslağa yazar, Yayınla ile müşteriye gider): ek içerik (tema, galeri, usta,
// yorumlar, bölüm açıklaması), doğrulama, "Sitenizi güzelleştirin" puanı ve müşteri sitesine yansıması. Şubeye ait
// bilgiler (haftalık saat, WhatsApp, nasıl gelinir) Ayarlar → Saatler ve iletişim'den (UpdateBranchSiteInfoCommand).
public class SiteContentHandlerTests : ApplicationTestBase
{
    private const string Slug = "narli-ev";

    private readonly FakeTenantResolver _tenant = new() { Slug = Slug };
    private readonly FakeImageStorageService _storage = new() { NextKey = "site/yeni.webp" };
    private static readonly IOptions<BunnyStorageOptions> Cdn = Options.Create(new BunnyStorageOptions { CdnBaseUrl = "https://cdn.test/" });
    private static readonly IOptions<SeoOptions> Seo = Options.Create(new SeoOptions());

    private Branch _branch = default!;
    private Region _salon = default!;

    private FakeCurrentUserService Owner => new()
    {
        Role = "Owner", UserId = CurrentUser.UserId, CompanyId = CurrentUser.CompanyId, BranchId = CurrentUser.CompanyId,
    };

    // Ayarlar şube modunda: token şubenin id'sini taşır.
    private FakeCurrentUserService BranchAdmin => new()
    {
        Role = "Admin", UserId = CurrentUser.UserId, CompanyId = CurrentUser.CompanyId, BranchId = CurrentUser.BranchId,
    };

    private async Task SeedAsync(bool withMenu = true)
    {
        User owner = await SeedActorAsync();
        Company company = Company.Create("Narlı Ev", owner);
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(company, CurrentUser.CompanyId);
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

    private static SaveSiteDraftCommand FullCommand(Guid regionId) => new()
    {
        Headline = "Avlulu bir taş evde.",
        StoryTitle = "Üç kuşaktır aynı ocağın başındayız.",
        About = "1987'de açıldık.",
        InstagramUrl = "https://instagram.com/narliev",
        Theme = "bordo",
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
        RegionDetails = [new SiteRegionDetailDto { RegionId = regionId, Description = "Ocak başına bakan masalar." }, new SiteRegionDetailDto { RegionId = Guid.NewGuid(), Description = "Başka şirket" }],
    };

    private static UpdateBranchSiteInfoCommand FullInfo() => new()
    {
        WeeklyHours = [.. new[] { 1, 2, 3, 4, 5, 6, 0 }.Select(d => new SiteDayHoursDto { Day = d, IsOpen = d != 0, Opens = "09:00", Closes = "23:30" })],
        HoursNote = "Pazar kapalıyız.",
        DirectionsNote = "Kadıköy iskelesinden 12 dk yürüme.",
        WhatsappPhone = "0532 000 48 48",
    };

    private async Task<int> VersionAsync()
        => (await new GetSiteEditorQueryHandler(Db, Owner, Cdn, Seo).Handle(new GetSiteEditorQuery(), CancellationToken.None)).Value!.Version;

    /// <summary>Taslağa yazar ve yayınlar; yayındaki hâli döner.</summary>
    private async Task<Result<BranchSiteDto>> UpdateAsync(SaveSiteDraftCommand command)
    {
        command.Version = await VersionAsync();
        var saved = await new SaveSiteDraftCommandHandler(Db, Owner, _storage, Cdn, Seo, TimeProvider.System).Handle(command, CancellationToken.None);
        if (!saved.IsSuccess) return Result<BranchSiteDto>.Failure(saved.Error!);
        var published = await new PublishSiteDraftCommandHandler(Db, Owner, _storage, Cdn, Seo, TimeProvider.System)
            .Handle(new PublishSiteDraftCommand { Version = saved.Value!.Editor.Version }, CancellationToken.None);
        return Result<BranchSiteDto>.Success(published.Value!.Editor.Published);
    }

    private Task<Result<BranchSiteInfoDto>> UpdateInfoAsync(UpdateBranchSiteInfoCommand command)
        => new UpdateBranchSiteInfoCommandHandler(Db, BranchAdmin).Handle(command, CancellationToken.None);

    private Task<Result<SiteEditorDto>> ImageAsync(SetSiteDraftImageCommand command, string nextKey)
    {
        _storage.NextKey = nextKey;
        return new SetSiteDraftImageCommandHandler(Db, Owner, _storage, Cdn, Seo, TimeProvider.System).Handle(command, CancellationToken.None);
    }

    private async Task PublishDraftAsync()
        => Assert.True((await new PublishSiteDraftCommandHandler(Db, Owner, _storage, Cdn, Seo, TimeProvider.System)
            .Handle(new PublishSiteDraftCommand { Version = await VersionAsync() }, CancellationToken.None)).IsSuccess);

    [Fact]
    public async Task Update_SavesAllFields_AndEditorReturnsThem()
    {
        await SeedAsync();

        var saved = await UpdateAsync(FullCommand(_salon.Id));
        Assert.True(saved.IsSuccess, saved.Error);

        BranchSiteDto site = saved.Value!;
        Assert.Equal("bordo", site.Theme);
        Assert.Equal(["avlu", "vale"], site.Amenities);
        Assert.Equal(4.7m, site.Rating);
        Assert.Equal("Elif K.", Assert.Single(site.FeaturedReviews).Author);
        Assert.Equal("Hasan Narlı", site.FounderName);
        Assert.Equal(1987, site.FoundedYear);
        Assert.Equal([1987, 2019], site.Milestones.Select(m => m.Year));
        // Admin şeklinde şirketin bütün bölümleri var; başka şirketin bölüm kimliği yok sayıldı.
        SiteRegionDetailDto region = Assert.Single(site.RegionDetails);
        Assert.Equal("Salon", region.Name);
        Assert.Equal(1, region.TableCount);
        Assert.Equal("Ocak başına bakan masalar.", region.Description);
    }

    [Fact]
    public async Task Update_DomainError_ReturnsFailure_AndDoesNotSave()
    {
        await SeedAsync();
        SaveSiteDraftCommand command = FullCommand(_salon.Id);
        command.Amenities = ["havuz"];

        var result = await UpdateAsync(command);

        Assert.False(result.IsSuccess);
        Assert.Contains("hazır listeden", result.Error);
        Company company = await DbContext.Companies.AsNoTracking().FirstAsync(c => c.Id == CurrentUser.CompanyId);
        Assert.Null(company.SiteDraft);
        Assert.Null(company.Site);
    }

    // ── Şubenin site bilgileri (Ayarlar → Saatler ve iletişim) ────────────────────────────────────

    [Fact]
    public async Task BranchInfo_SavesHoursWhatsappDirections_AndReachesPublicSite()
    {
        await SeedAsync();

        var saved = await UpdateInfoAsync(FullInfo());

        Assert.True(saved.IsSuccess, saved.Error);
        BranchSiteInfoDto info = saved.Value!;
        Assert.Equal(7, info.WeeklyHours.Count);
        Assert.Equal(1, info.WeeklyHours[0].Day); // Pazartesi başta
        Assert.Equal("09:00", info.OpensAt); // eski tek aralık en sık aralıkla güncellendi
        Assert.Equal("23:30", info.ClosesAt);
        Assert.Equal("0532 000 48 48", info.WhatsappPhone);

        var get = await new GetBranchSiteInfoQueryHandler(Db, BranchAdmin).Handle(new GetBranchSiteInfoQuery(), CancellationToken.None);
        Assert.Equal("Kadıköy iskelesinden 12 dk yürüme.", get.Value!.DirectionsNote);

        var site = await new GetPublicSiteQueryHandler(Db, _tenant, Cdn).Handle(new GetPublicSiteQuery(), CancellationToken.None);
        Assert.Equal("0532 000 48 48", site.Value!.Site.WhatsappPhone);
        Assert.Equal("Pazar kapalıyız.", site.Value.Site.HoursNote);
        Assert.False(site.Value.Site.WeeklyHours.Single(d => d.Day == 0).IsOpen);
        Assert.NotNull(site.Value.IsOpenNow);
    }

    [Fact]
    public async Task BranchInfo_InvalidPhone_Fails_CompanyMode_HasNoBranch()
    {
        await SeedAsync();
        UpdateBranchSiteInfoCommand command = FullInfo();
        command.WhatsappPhone = "whatsapp";

        var bad = await UpdateInfoAsync(command);
        var companyMode = await new GetBranchSiteInfoQueryHandler(Db, Owner).Handle(new GetBranchSiteInfoQuery(), CancellationToken.None);

        Assert.False(bad.IsSuccess);
        Assert.Null((await DbContext.Branches.AsNoTracking().FirstAsync(b => b.Id == _branch.Id)).SiteContent);
        Assert.False(companyMode.IsSuccess); // "Tümü" modunda şube yok
    }

    [Fact]
    public void BranchInfoValidator_RejectsLimits()
    {
        var result = new UpdateBranchSiteInfoCommandValidator().TestValidate(new UpdateBranchSiteInfoCommand
        {
            OpensAt = "9",
            WeeklyHours = [new SiteDayHoursDto { Day = 1, IsOpen = true, Opens = "9", Closes = "23:00" }],
            DirectionsNote = new string('a', SiteContent.DirectionsNoteMaxLength + 1),
            HoursNote = new string('a', Branch.HoursNoteMaxLength + 1),
        });

        result.ShouldHaveValidationErrorFor(x => x.OpensAt);
        result.ShouldHaveValidationErrorFor(x => x.WeeklyHours);
        result.ShouldHaveValidationErrorFor("WeeklyHours[0].Opens");
        result.ShouldHaveValidationErrorFor(x => x.DirectionsNote);
        result.ShouldHaveValidationErrorFor(x => x.HoursNote);
        new UpdateBranchSiteInfoCommandValidator().TestValidate(new UpdateBranchSiteInfoCommand()).ShouldNotHaveAnyValidationErrors();
    }

    // ── Sitenin metin doğrulaması ─────────────────────────────────────────────────────────────────

    [Fact]
    public void Validator_RejectsLimits()
    {
        var validator = new SaveSiteDraftCommandValidator();
        var command = new SaveSiteDraftCommand
        {
            Theme = "pembe",
            Rating = 6,
            FeaturedReviews = [.. Enumerable.Range(0, 4).Select(_ => new SiteReviewDto { Author = "A", Text = "B" })],
            Values = [.. Enumerable.Range(0, 4).Select(_ => new SiteValueDto { Title = "A" })],
            Milestones = [.. Enumerable.Range(0, 6).Select(i => new SiteMilestoneDto { Year = 2000 + i, Text = "A" })],
            Amenities = ["havuz"],
            FounderQuote = new string('a', SiteContent.FounderQuoteMaxLength + 1),
        };

        var result = validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor(x => x.Theme);
        result.ShouldHaveValidationErrorFor(x => x.Rating);
        result.ShouldHaveValidationErrorFor(x => x.FeaturedReviews.Count);
        result.ShouldHaveValidationErrorFor(x => x.Values.Count);
        result.ShouldHaveValidationErrorFor(x => x.Milestones.Count);
        result.ShouldHaveValidationErrorFor("Amenities[0]");
        result.ShouldHaveValidationErrorFor(x => x.FounderQuote);
    }

    [Fact]
    public void Validator_HiddenFaqs_RejectsBadKeysAndTooMany_AcceptsSlugsAndNull()
    {
        var validator = new SaveSiteDraftCommandValidator();

        var bad = validator.TestValidate(new SaveSiteDraftCommand { HiddenFaqs = ["rezervasyon", "Ödeme yolu!", new string('a', 41)] });
        bad.ShouldHaveValidationErrorFor("HiddenFaqs[1]");
        bad.ShouldHaveValidationErrorFor("HiddenFaqs[2]");
        bad.ShouldNotHaveValidationErrorFor("HiddenFaqs[0]");

        var many = validator.TestValidate(new SaveSiteDraftCommand { HiddenFaqs = [.. Enumerable.Range(0, SiteContent.HiddenFaqsMax + 1).Select(i => $"soru-{i}")] });
        many.ShouldHaveValidationErrorFor("HiddenFaqs.Count");

        validator.TestValidate(new SaveSiteDraftCommand { HiddenFaqs = ["rezervasyon-sorgula", "otopark", "teslimat-bolgeleri"] }).ShouldNotHaveAnyValidationErrors();
        validator.TestValidate(new SaveSiteDraftCommand { HiddenFaqs = null }).ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("pembe")]
    [InlineData("tema2")]
    [InlineData("renkli-sade")]
    public void Validator_Design_RejectsUnknownKey(string design)
        => new SaveSiteDraftCommandValidator()
            .TestValidate(new SaveSiteDraftCommand { Design = design })
            .ShouldHaveValidationErrorFor(x => x.Design);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("renkli")]
    [InlineData("sade")]
    [InlineData(" Sade ")]
    [InlineData("elit")]
    [InlineData(" ELIT ")]
    [InlineData("sicak")]
    [InlineData(" SICAK ")]
    [InlineData("meyhane")]
    [InlineData(" Esnaf ")]
    [InlineData("bahce")]
    public void Validator_Design_AcceptsKnownEmptyAndNull(string? design)
        => new SaveSiteDraftCommandValidator()
            .TestValidate(new SaveSiteDraftCommand { Design = design })
            .ShouldNotHaveAnyValidationErrors();

    [Fact]
    public async Task Update_Design_NormalizedAndKeptWhenOmitted()
    {
        await SeedAsync();
        SaveSiteDraftCommand command = FullCommand(_salon.Id);
        command.Design = " SADE ";
        var first = await UpdateAsync(command);
        Assert.True(first.IsSuccess, first.Error);
        Assert.Equal("sade", first.Value!.Design);

        // Alan gönderilmezse (null) tasarım korunur.
        command.Design = null;
        var second = await UpdateAsync(command);
        Assert.True(second.IsSuccess, second.Error);
        Assert.Equal("sade", second.Value!.Design);

        var site = await new GetPublicSiteQueryHandler(Db, _tenant, Cdn).Handle(new GetPublicSiteQuery(), CancellationToken.None);
        Assert.True(site.IsSuccess, site.Error);
        Assert.Equal("sade", site.Value!.Site.Design);

        // Boş = varsayılana (sophra) döner.
        command.Design = "";
        var third = await UpdateAsync(command);
        Assert.True(third.IsSuccess, third.Error);
        Assert.Equal(string.Empty, third.Value!.Design);
    }

    [Theory]
    [InlineData("comic-sans")]
    [InlineData("playfair")]
    [InlineData("inter-playfair")]
    public void Validator_Font_RejectsUnknownKey(string font)
        => new SaveSiteDraftCommandValidator()
            .TestValidate(new SaveSiteDraftCommand { Font = font })
            .ShouldHaveValidationErrorFor(x => x.Font);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("fraunces-manrope")]
    [InlineData("instrument-manrope")]
    [InlineData("bodoni-montserrat")]
    [InlineData("playfair-inter")]
    [InlineData("dmserif-dmsans")]
    [InlineData("cormorant-lato")]
    [InlineData(" Grotesk-Inter ")]
    [InlineData("montserrat-poppins")]
    [InlineData("youngserif-figtree")]
    [InlineData(" Anton-Archivo ")]
    [InlineData("bricolage-figtree")]
    public void Validator_Font_AcceptsKnownEmptyAndNull(string? font)
        => new SaveSiteDraftCommandValidator()
            .TestValidate(new SaveSiteDraftCommand { Font = font })
            .ShouldNotHaveAnyValidationErrors();

    [Fact]
    public void Validator_AcceptsNewAmenityKeys()
        => new SaveSiteDraftCommandValidator()
            .TestValidate(new SaveSiteDraftCommand { Amenities = ["bebek-sandalyesi", "aile-salonu", "sigara-alani", "ozel-gun"] })
            .ShouldNotHaveAnyValidationErrors();

    [Fact]
    public async Task Update_NewAmenities_KeptInFixedOrder_AndOmittedHiddenFaqsKept()
    {
        await SeedAsync();
        SaveSiteDraftCommand command = FullCommand(_salon.Id);
        command.Amenities = ["ozel-gun", "otopark", "bebek-sandalyesi", "sigara-alani", "aile-salonu"];
        command.HiddenFaqs = ["Otopark", "odeme", "otopark"];

        var first = await UpdateAsync(command);
        Assert.True(first.IsSuccess, first.Error);
        Assert.Equal(["otopark", "bebek-sandalyesi", "aile-salonu", "sigara-alani", "ozel-gun"], first.Value!.Amenities);
        // Küçük harfe çevrilir, tekrar atılır, sıra korunur.
        Assert.Equal(["otopark", "odeme"], first.Value.HiddenFaqs);

        // Alan gönderilmezse (null) gizlenenler korunur.
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
        => new SaveSiteDraftCommandValidator().TestValidate(new SaveSiteDraftCommand()).ShouldNotHaveAnyValidationErrors();

    // ── Fotoğraflar ───────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Gallery_TwelfthIsLast_UploadsUnderSiteFolder()
    {
        await SeedAsync();
        for (int i = 0; i < SiteContent.GalleryMax; i++)
        {
            var r = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Gallery, Content = new MemoryStream([1]) }, $"site/{i}.webp");
            Assert.True(r.IsSuccess, r.Error);
        }
        Assert.Equal("site", _storage.LastFolder);

        int uploadsBefore = _storage.UploadedKeys.Count;
        var full = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Gallery, Content = new MemoryStream([1]) }, "site/fazla.webp");
        Assert.False(full.IsSuccess);
        Assert.Equal(uploadsBefore, _storage.UploadedKeys.Count); // dolu galeriye dosya yüklenmedi
    }

    [Fact]
    public async Task RegionPhoto_OnlyForOwnRegion_AndShowsOnPublicSite()
    {
        await SeedAsync();

        var foreign = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Region, RegionId = Guid.NewGuid(), Content = new MemoryStream([1]) }, "site/x.webp");
        Assert.False(foreign.IsSuccess);

        var ok = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Region, RegionId = _salon.Id, Content = new MemoryStream([1]) }, "site/salon.webp");
        Assert.True(ok.IsSuccess, ok.Error);
        await UpdateAsync(FullCommand(_salon.Id));

        var site = await new GetPublicSiteQueryHandler(Db, _tenant, Cdn).Handle(new GetPublicSiteQuery(), CancellationToken.None);
        Assert.True(site.IsSuccess, site.Error);
        PublicRegionDto region = Assert.Single(site.Value!.Regions);
        Assert.Equal("https://cdn.test/site/salon.webp", region.PhotoUrl);
        Assert.Equal("Ocak başına bakan masalar.", region.Description);
        Assert.Equal("bordo", site.Value.Site.Theme);
        Assert.Empty(site.Value.Site.RegionDetails); // sitede bölüm bilgisi regions[] içinde
    }

    [Fact]
    public async Task Team_ReachesPublicSite_DomainLimitsApply_NamelessDropped()
    {
        await SeedAsync();
        Guid chef = Guid.NewGuid();
        SaveSiteDraftCommand command = FullCommand(_salon.Id);
        command.TeamTitle = "Sofranın arkasındakiler.";
        command.TeamMembers =
        [
            new SiteTeamMemberDto { Id = chef, Name = " Ayşe Usta ", Role = "Mutfak şefi", Note = "Sabah altıda ocağı ilk o yakar." },
            new SiteTeamMemberDto { Id = Guid.NewGuid(), Name = "", Role = "Salon şefi" },
        ];

        var saved = await UpdateAsync(command);

        Assert.True(saved.IsSuccess, saved.Error);
        var site = await new GetPublicSiteQueryHandler(Db, _tenant, Cdn).Handle(new GetPublicSiteQuery(), CancellationToken.None);
        SiteTeamMemberDto member = Assert.Single(site.Value!.Site.TeamMembers);
        Assert.Equal(chef, member.Id);
        Assert.Equal("Ayşe Usta", member.Name);
        Assert.Equal("Sofranın arkasındakiler.", site.Value.Site.TeamTitle);

        // Doğrulayıcıyı atlayan istek de alan sınırına takılır (domain).
        SaveSiteDraftCommand tooLong = FullCommand(_salon.Id);
        tooLong.TeamMembers = [new SiteTeamMemberDto { Id = chef, Name = "Ayşe", Note = new string('n', SiteContent.TeamNoteMaxLength + 1) }];
        var rejected = await UpdateAsync(tooLong);
        Assert.False(rejected.IsSuccess);
        Assert.Equal($"Ekip üyesinin notu en fazla {SiteContent.TeamNoteMaxLength} karakter olabilir.", rejected.Error);
    }

    [Fact]
    public async Task PublicSite_NeverPublished_HasDefaultThemeAndToday()
    {
        await SeedAsync();

        var site = await new GetPublicSiteQueryHandler(Db, _tenant, Cdn).Handle(new GetPublicSiteQuery(), CancellationToken.None);

        Assert.True(site.IsSuccess, site.Error);
        Assert.Equal(string.Empty, site.Value!.Site.Theme); // boş = varsayılan terracotta (ön yüz)
        Assert.Empty(site.Value.Site.WeeklyHours);
        Assert.Null(site.Value.IsOpenNow);
        Assert.InRange(site.Value.Today, 0, 6);
    }

    // ── "Sitenizi güzelleştirin" ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Completeness_EmptySite_IsLow_AndOrderedByImpact()
    {
        await SeedAsync();

        var result = await new GetSiteCompletenessQueryHandler(Db, Owner).Handle(new GetSiteCompletenessQuery(), CancellationToken.None);

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
        await DbContext.SaveChangesAsync();
        await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Cover, Content = new MemoryStream([1]) }, "site/kapak.webp");
        await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.About, Content = new MemoryStream([1]) }, "site/hikaye.webp");
        await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Founder, Content = new MemoryStream([1]) }, "site/usta.webp");
        for (int i = 0; i < 3; i++)
            await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Gallery, Content = new MemoryStream([1]) }, $"site/g{i}.webp");
        await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Region, RegionId = _salon.Id, Content = new MemoryStream([1]) }, "site/salon.webp");
        SaveSiteDraftCommand command = FullCommand(_salon.Id);
        command.Tagline = "Alt";
        await UpdateAsync(command);
        await UpdateInfoAsync(FullInfo()); // saatler, WhatsApp, nasıl gelinir şubeden

        var result = await new GetSiteCompletenessQueryHandler(Db, Owner).Handle(new GetSiteCompletenessQuery(), CancellationToken.None);

        Assert.Equal(100, result.Value!.Score);
        Assert.All(result.Value.Items, i => Assert.True(i.Done, i.Key));
    }

    [Fact]
    public async Task Completeness_NoProducts_AsksToAddProducts()
    {
        await SeedAsync(withMenu: false);

        var result = await new GetSiteCompletenessQueryHandler(Db, Owner).Handle(new GetSiteCompletenessQuery(), CancellationToken.None);

        SiteChecklistItemDto item = result.Value!.Items.Single(i => i.Key == "productPhotos");
        Assert.Equal("Menüye ürün ekleyin", item.Title);
        Assert.False(item.Done);
    }
}
