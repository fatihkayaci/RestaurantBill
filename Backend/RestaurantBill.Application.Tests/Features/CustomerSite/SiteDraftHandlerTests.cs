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
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.CustomerSite;

// Görsel site düzenleyicisi (şirket geneli, yalnız sahip): taslak kaydet / çatışma, yayınla, at, alan bazında geri al, taslağa
// fotoğraf ve hazır görsel. Kural: müşteri sitesi Yayınla'ya kadar eski hâli görür; dosya ancak ne yayında ne taslakta
// kullanılıyorsa silinir, shared/ asla. Şubeye ait alanlar (saatler, WhatsApp, nasıl gelinir) taslağa yazılmaz.
public class SiteDraftHandlerTests : ApplicationTestBase
{
    private const string Slug = "ocak";
    private const string StockKey = "shared/stock/mangal.webp";

    private readonly FakeTenantResolver _tenant = new() { Slug = Slug };
    private readonly FakeImageStorageService _storage = new();
    private static readonly IOptions<BunnyStorageOptions> Cdn = Options.Create(new BunnyStorageOptions { CdnBaseUrl = "https://cdn.test/" });
    private static readonly IOptions<SeoOptions> Seo = Options.Create(new SeoOptions());

    private Company _company = default!;
    private Branch _branch = default!;
    private Region _salon = default!;
    private StockImage _stock = default!;

    // Site yalnız sahibin "Tümü" modunda düzenlenir: token şirket id'sini taşır.
    private FakeCurrentUserService Owner => new()
    {
        Role = "Owner", UserId = CurrentUser.UserId, CompanyId = CurrentUser.CompanyId, BranchId = CurrentUser.CompanyId,
    };

    /// <summary>Yayındaki siteyi sürüm artırmadan yazar (göçle şirkete taşınmış bir site gibi).</summary>
    private static void SetPublished(Company company, SiteSnapshot site)
        => typeof(Company).GetProperty(nameof(Company.Site))!.SetValue(company, site);

    private async Task SeedAsync()
    {
        User owner = await SeedActorAsync("Fatma Usta");
        Company company = Company.Create("Ocak", owner);
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(company, CurrentUser.CompanyId);
        company.Slug = Slug;
        _company = company;
        DbContext.Companies.Add(company);
        _branch = Branch.Create(company.Id, "Moda", "", "", "", "İstanbul", "Kadıköy", "Moda Cd. 48", 10m);
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(_branch, CurrentUser.BranchId);
        DbContext.Branches.Add(_branch);
        _stock = StockImage.Create(StockKey, "Mangal başı", ["mangal"], "Mekân");
        DbContext.StockImages.Add(_stock);
        await DbContext.SaveChangesAsync();
        _salon = await SeedRegionAsync();

        // Yayında: kendi yüklenmiş kapak ve hikâye fotoğrafı.
        SetPublished(company, SiteSnapshot.Empty with
        {
            Headline = "Ocakbaşı", Tagline = "Közde pişen et.", CoverImage = "site/eski-kapak.webp", AboutImage = "site/hikaye.webp",
        });
        await DbContext.SaveChangesAsync();
    }

    private Task<Result<SiteEditorDto>> GetAsync()
        => new GetSiteEditorQueryHandler(Db, Owner, Cdn, Seo).Handle(new GetSiteEditorQuery(), CancellationToken.None);

    private Task<Result<SiteDraftResultDto>> SaveAsync(SaveSiteDraftCommand command)
        => new SaveSiteDraftCommandHandler(Db, Owner, _storage, Cdn, Seo, TimeProvider.System).Handle(command, CancellationToken.None);

    private Task<Result<SiteEditorDto>> ImageAsync(SetSiteDraftImageCommand command, string? nextKey = null)
    {
        if (nextKey is not null) _storage.NextKey = nextKey;
        return new SetSiteDraftImageCommandHandler(Db, Owner, _storage, Cdn, Seo, TimeProvider.System).Handle(command, CancellationToken.None);
    }

    private Task<Result<SiteDraftResultDto>> PublishAsync(int version)
        => new PublishSiteDraftCommandHandler(Db, Owner, _storage, Cdn, Seo, TimeProvider.System)
            .Handle(new PublishSiteDraftCommand { Version = version }, CancellationToken.None);

    private Task<Result<SiteDraftResultDto>> DiscardAsync(int version)
        => new DiscardSiteDraftCommandHandler(Db, Owner, _storage, Cdn, Seo)
            .Handle(new DiscardSiteDraftCommand { Version = version }, CancellationToken.None);

    private async Task<PublicSiteDto> PublicSiteAsync()
    {
        var site = await new GetPublicSiteQueryHandler(Db, _tenant, Cdn).Handle(new GetPublicSiteQuery(), CancellationToken.None);
        Assert.True(site.IsSuccess, site.Error);
        return site.Value!;
    }

    private static SaveSiteDraftCommand TextsFrom(BranchSiteDto site, int version) => new()
    {
        Version = version,
        Headline = site.Headline,
        Tagline = site.Tagline,
        StoryTitle = site.StoryTitle,
        About = site.About,
        OpensAt = site.OpensAt,
        ClosesAt = site.ClosesAt,
        HoursNote = site.HoursNote,
        InstagramUrl = site.InstagramUrl,
        AccentColor = site.AccentColor,
        Theme = site.Theme,
        Design = site.Design,
        Font = site.Font,
        WeeklyHours = site.WeeklyHours,
        DirectionsNote = site.DirectionsNote,
        WhatsappPhone = site.WhatsappPhone,
        Amenities = site.Amenities,
        HiddenFaqs = site.HiddenFaqs,
        Rating = site.Rating,
        ReviewCount = site.ReviewCount,
        ReviewsUrl = site.ReviewsUrl,
        FeaturedReviews = site.FeaturedReviews,
        FounderName = site.FounderName,
        FounderTitle = site.FounderTitle,
        FounderQuote = site.FounderQuote,
        FoundedYear = site.FoundedYear,
        Values = site.Values,
        Milestones = site.Milestones,
        RegionDetails = site.RegionDetails,
        TeamMembers = site.TeamMembers,
        TeamTitle = site.TeamTitle,
        TeamIntro = site.TeamIntro,
        SeoTitle = site.SeoTitle,
        SeoDescription = site.SeoDescription,
    };

    [Fact]
    public async Task Editor_WithoutDraft_ShowsPublished_NoChanges()
    {
        await SeedAsync();

        SiteEditorDto editor = (await GetAsync()).Value!;

        Assert.False(editor.HasChanges);
        Assert.Empty(editor.Changes);
        Assert.Equal(0, editor.Version);
        Assert.Equal("Közde pişen et.", editor.Draft.Tagline);
        Assert.Equal("https://cdn.test/site/eski-kapak.webp", editor.Draft.CoverImageUrl);
        Assert.Equal("https://ocak.sophram.com", editor.SiteUrl);
        Assert.Equal("Salon", Assert.Single(editor.Draft.RegionDetails).Name);
        // Otomatik SEO: ad · ilçe; görsel = kapak.
        Assert.Equal("Ocak · Kadıköy", editor.Seo.Title);
        Assert.True(editor.Seo.TitleIsAuto);
        Assert.Equal("https://cdn.test/site/eski-kapak.webp", editor.Seo.ShareImageUrl);
        Assert.Equal("Menü · Ocak", editor.Seo.PageTitles["/menu"]);
    }

    [Fact]
    public async Task Design_DraftThenPublish_AndRevert_IndependentOfTheme()
    {
        await SeedAsync();
        SiteEditorDto editor = (await GetAsync()).Value!;
        Assert.Equal(string.Empty, editor.Draft.Design); // boş = varsayılan tasarım (ön yüz: sophra)

        SaveSiteDraftCommand command = TextsFrom(editor.Draft, editor.Version);
        command.Design = " Sade ";
        command.Theme = "bordo";
        var saved = await SaveAsync(command);

        Assert.True(saved.IsSuccess, saved.Error);
        SiteEditorDto after = saved.Value!.Editor;
        Assert.Equal(["design", "theme"], after.Changes.Select(c => c.Field));
        SiteChangeDto change = after.Changes[0];
        Assert.Equal("Tasarım", change.Label);
        Assert.Equal("Tema", change.Page);
        Assert.Equal("sade", after.Draft.Design);
        Assert.Equal("bordo", after.Draft.Theme);
        Assert.Equal(string.Empty, after.Published.Design);
        Assert.Equal(string.Empty, (await PublicSiteAsync()).Site.Design);

        // Yalnız tasarım geri alınır; renk teması taslakta kalır.
        var reverted = await new RevertSiteDraftFieldsCommandHandler(Db, Owner, _storage, Cdn, Seo, TimeProvider.System)
            .Handle(new RevertSiteDraftFieldsCommand { Version = after.Version, Fields = ["design"] }, CancellationToken.None);
        Assert.True(reverted.IsSuccess, reverted.Error);
        Assert.Equal(string.Empty, reverted.Value!.Editor.Draft.Design);
        Assert.Equal("bordo", reverted.Value.Editor.Draft.Theme);
        Assert.Equal("theme", Assert.Single(reverted.Value.Editor.Changes).Field);

        // Yeniden seç ve yayınla: müşteri sitesi görür.
        command = TextsFrom(reverted.Value.Editor.Draft, reverted.Value.Editor.Version);
        command.Design = "sade";
        var again = await SaveAsync(command);
        Assert.True(again.IsSuccess, again.Error);
        var published = await PublishAsync(again.Value!.Editor.Version);
        Assert.True(published.IsSuccess, published.Error);
        Assert.False(published.Value!.Editor.HasChanges);
        Assert.Equal("sade", published.Value.Editor.Published.Design);
        Assert.Equal("sade", (await PublicSiteAsync()).Site.Design);
        Assert.Equal("bordo", (await PublicSiteAsync()).Site.Theme);

        // Tasarımı göndermeyen kayıt (null) tasarımı değiştirmez.
        command = TextsFrom(published.Value.Editor.Draft, published.Value.Editor.Version);
        command.Design = null;
        command.Headline = "Yeni başlık";
        var keep = await SaveAsync(command);
        Assert.True(keep.IsSuccess, keep.Error);
        Assert.Equal("sade", keep.Value!.Editor.Draft.Design);
        Assert.DoesNotContain(keep.Value.Editor.Changes, c => c.Field == "design");
    }

    [Fact]
    public async Task HomeSections_DraftThenPublish_ReachPublicSite_AndNullKeepsThem()
    {
        await SeedAsync();
        SiteEditorDto editor = (await GetAsync()).Value!;
        Assert.Empty(editor.Draft.HomeSections); // boş = varsayılan sıra (ekip kapalı, diğerleri açık)

        SaveSiteDraftCommand command = TextsFrom(editor.Draft, editor.Version);
        command.Design = "sophra";
        command.HomeSections = [new SiteHomeSectionDto { Key = "reviews", Enabled = false }, new SiteHomeSectionDto { Key = "featured", Enabled = true }];
        var saved = await SaveAsync(command);

        Assert.True(saved.IsSuccess, saved.Error);
        SiteEditorDto after = saved.Value!.Editor;
        Assert.Equal(["design", "homeSections"], after.Changes.Select(c => c.Field));
        SiteChangeDto change = after.Changes[1];
        Assert.Equal("Anasayfa bölümleri", change.Label);
        Assert.Equal("Anasayfa", change.Page);
        Assert.Equal(["reviews", "featured", "categories", "about", "team", "features", "gallery", "contact"], after.Draft.HomeSections.Select(h => h.Key));
        Assert.False(after.Draft.HomeSections[0].Enabled);
        Assert.False(after.Draft.HomeSections.Single(h => h.Key == "team").Enabled); // ekip varsayılanı kapalı
        Assert.Empty((await PublicSiteAsync()).Site.HomeSections);

        var published = await PublishAsync(after.Version);
        Assert.True(published.IsSuccess, published.Error);
        BranchSiteDto live = (await PublicSiteAsync()).Site;
        Assert.Equal("sophra", live.Design);
        Assert.Equal("reviews", live.HomeSections[0].Key);
        Assert.False(live.HomeSections[0].Enabled);

        // Bölümleri göndermeyen kayıt (eski form, null) düzeni değiştirmez.
        command = TextsFrom(published.Value!.Editor.Draft, published.Value.Editor.Version);
        command.HomeSections = null;
        command.Headline = "Yeni başlık";
        var keep = await SaveAsync(command);
        Assert.True(keep.IsSuccess, keep.Error);
        Assert.Equal(SiteContent.HomeSectionKeys.Count, keep.Value!.Editor.Draft.HomeSections.Count);
        Assert.DoesNotContain(keep.Value.Editor.Changes, c => c.Field == "homeSections");
    }

    [Fact]
    public void Validator_HomeSections_RejectsUnknownAndDuplicateKeys()
    {
        var validator = new SaveSiteDraftCommandValidator();
        validator.TestValidate(new SaveSiteDraftCommand { HomeSections = [new SiteHomeSectionDto { Key = "hero" }] })
            .ShouldHaveValidationErrorFor(x => x.HomeSections);
        validator.TestValidate(new SaveSiteDraftCommand
        {
            HomeSections = [new SiteHomeSectionDto { Key = "about" }, new SiteHomeSectionDto { Key = " About ", Enabled = false }],
        }).ShouldHaveValidationErrorFor(x => x.HomeSections);
        validator.TestValidate(new SaveSiteDraftCommand { HomeSections = [new SiteHomeSectionDto { Key = " Gallery ", Enabled = false }] })
            .ShouldNotHaveAnyValidationErrors();
        validator.TestValidate(new SaveSiteDraftCommand { HomeSections = null }).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public async Task Font_DraftThenPublish_AndNullKeepsIt()
    {
        await SeedAsync();
        SiteEditorDto editor = (await GetAsync()).Value!;
        Assert.Equal(string.Empty, editor.Draft.Font); // boş = tasarımın kendi yazı tipi

        SaveSiteDraftCommand command = TextsFrom(editor.Draft, editor.Version);
        command.Font = " Playfair-Inter ";
        var saved = await SaveAsync(command);
        Assert.True(saved.IsSuccess, saved.Error);
        SiteEditorDto after = saved.Value!.Editor;
        SiteChangeDto change = Assert.Single(after.Changes);
        Assert.Equal("font", change.Field);
        Assert.Equal("Yazı tipi", change.Label);
        Assert.Equal("Tema", change.Page);
        Assert.Equal("playfair-inter", after.Draft.Font);
        Assert.Equal(string.Empty, after.Published.Font);
        Assert.Equal(string.Empty, (await PublicSiteAsync()).Site.Font);

        // Geri al: yayındaki (boş) değere döner.
        var reverted = await new RevertSiteDraftFieldsCommandHandler(Db, Owner, _storage, Cdn, Seo, TimeProvider.System)
            .Handle(new RevertSiteDraftFieldsCommand { Version = after.Version, Fields = ["font"] }, CancellationToken.None);
        Assert.True(reverted.IsSuccess, reverted.Error);
        Assert.Equal(string.Empty, reverted.Value!.Editor.Draft.Font);
        Assert.False(reverted.Value.Editor.HasChanges);

        command = TextsFrom(reverted.Value.Editor.Draft, reverted.Value.Editor.Version);
        command.Font = "playfair-inter";
        var again = await SaveAsync(command);
        Assert.True(again.IsSuccess, again.Error);
        var published = await PublishAsync(again.Value!.Editor.Version);
        Assert.True(published.IsSuccess, published.Error);
        Assert.Equal("playfair-inter", published.Value!.Editor.Published.Font);
        Assert.Equal("playfair-inter", (await PublicSiteAsync()).Site.Font);

        // Yazı tipini göndermeyen kayıt (null) değiştirmez.
        command = TextsFrom(published.Value.Editor.Draft, published.Value.Editor.Version);
        command.Font = null;
        command.Headline = "Yeni başlık";
        var keep = await SaveAsync(command);
        Assert.True(keep.IsSuccess, keep.Error);
        Assert.Equal("playfair-inter", keep.Value!.Editor.Draft.Font);
        Assert.DoesNotContain(keep.Value.Editor.Changes, c => c.Field == "font");
    }

    [Fact]
    public async Task HiddenFaqs_DraftThenPublish_AndRevert()
    {
        await SeedAsync();
        SiteEditorDto editor = (await GetAsync()).Value!;
        Assert.Empty(editor.Draft.HiddenFaqs);

        SaveSiteDraftCommand command = TextsFrom(editor.Draft, editor.Version);
        command.HiddenFaqs = ["odeme", "otopark"];
        var saved = await SaveAsync(command);

        Assert.True(saved.IsSuccess, saved.Error);
        SiteEditorDto after = saved.Value!.Editor;
        SiteChangeDto change = Assert.Single(after.Changes);
        Assert.Equal("hiddenFaqs", change.Field);
        Assert.Equal("Sık sorulanlar", change.Label);
        Assert.Equal("İletişim", change.Page);
        Assert.Equal(["odeme", "otopark"], after.Draft.HiddenFaqs);
        Assert.Empty(after.Published.HiddenFaqs);
        Assert.Empty((await PublicSiteAsync()).Site.HiddenFaqs);

        // Alan bazında geri alınır.
        var reverted = await new RevertSiteDraftFieldsCommandHandler(Db, Owner, _storage, Cdn, Seo, TimeProvider.System)
            .Handle(new RevertSiteDraftFieldsCommand { Version = after.Version, Fields = ["hiddenFaqs"] }, CancellationToken.None);
        Assert.True(reverted.IsSuccess, reverted.Error);
        Assert.False(reverted.Value!.Editor.HasChanges);
        Assert.Empty(reverted.Value.Editor.Draft.HiddenFaqs);

        // Yeniden gizle ve yayınla: müşteri sitesi görür.
        command = TextsFrom(reverted.Value.Editor.Draft, reverted.Value.Editor.Version);
        command.HiddenFaqs = ["rezervasyon"];
        var again = await SaveAsync(command);
        Assert.True(again.IsSuccess, again.Error);
        var published = await PublishAsync(again.Value!.Editor.Version);
        Assert.True(published.IsSuccess, published.Error);
        Assert.Equal(["rezervasyon"], (await PublicSiteAsync()).Site.HiddenFaqs);
    }

    [Fact]
    public async Task SaveDraft_ChangesDraftOnly_PublicSiteUnchanged_UntilPublish()
    {
        await SeedAsync();
        SiteEditorDto editor = (await GetAsync()).Value!;
        SaveSiteDraftCommand command = TextsFrom(editor.Draft, editor.Version);
        command.Tagline = "Odun fırınından taze pide.";
        command.SeoTitle = "Ocak Kadıköy — ocakbaşı";

        var saved = await SaveAsync(command);

        Assert.True(saved.IsSuccess, saved.Error);
        Assert.False(saved.Value!.Conflict);
        SiteEditorDto after = saved.Value.Editor;
        Assert.Equal(1, after.Version);
        Assert.True(after.HasChanges);
        Assert.Equal(["tagline", "seoTitle"], after.Changes.Select(c => c.Field));
        Assert.Equal("Alt başlık", after.Changes[0].Label);
        Assert.Equal("Anasayfa", after.Changes[0].Page);
        Assert.Equal("Közde pişen et.", after.Published.Tagline);
        Assert.Equal("Ocak Kadıköy — ocakbaşı", after.Seo.Title);

        PublicSiteDto site = await PublicSiteAsync();
        Assert.Equal("Közde pişen et.", site.Site.Tagline);
        Assert.Equal("Ocak · Kadıköy", site.Seo.Title); // yayındaki SEO hâlâ otomatik

        var published = await PublishAsync(after.Version);
        Assert.True(published.IsSuccess, published.Error);
        Assert.False(published.Value!.Editor.HasChanges);
        Assert.NotNull(published.Value.Editor.PublishedAt);

        site = await PublicSiteAsync();
        Assert.Equal("Odun fırınından taze pide.", site.Site.Tagline);
        Assert.Equal("Ocak Kadıköy — ocakbaşı", site.Seo.Title);
        Company stored = await DbContext.Companies.AsNoTracking().FirstAsync(c => c.Id == _company.Id);
        Assert.Null(stored.SiteDraft);
        Assert.Equal("Ocak Kadıköy — ocakbaşı", stored.GetPublishedSite().Content.SeoTitle); // SEO jsonb'de saklandı

        AuditLog log = Assert.Single(DbContext.AuditLogs.Where(a => a.Action == "SitePublished"));
        Assert.Contains("2 değişikliği yayınladı", log.Message);
        Assert.Contains("Alt başlık", log.Message);
    }

    [Fact]
    public async Task SaveDraft_StaleVersion_ReturnsConflict_AndDoesNotWrite()
    {
        await SeedAsync();
        SiteEditorDto editor = (await GetAsync()).Value!;
        SaveSiteDraftCommand first = TextsFrom(editor.Draft, editor.Version);
        first.Headline = "Birinci sekme";
        Assert.False((await SaveAsync(first)).Value!.Conflict);

        // İkinci sekme hâlâ eski sürümü tutuyor.
        SaveSiteDraftCommand second = TextsFrom(editor.Draft, editor.Version);
        second.Headline = "İkinci sekme";
        var result = await SaveAsync(second);

        Assert.True(result.IsSuccess, result.Error);
        Assert.True(result.Value!.Conflict);
        Assert.Equal("Birinci sekme", result.Value.Editor.Draft.Headline); // güncel hâl döner
        Assert.Equal(1, result.Value.Editor.Version);

        // Yayınla ve at da eski sürümle çatışır.
        Assert.True((await PublishAsync(0)).Value!.Conflict);
        Assert.True((await DiscardAsync(0)).Value!.Conflict);
        Assert.Equal("Ocakbaşı", (await PublicSiteAsync()).Site.Headline);
    }

    [Fact]
    public async Task SaveDraft_DomainError_ReturnsFailure()
    {
        await SeedAsync();
        SiteEditorDto editor = (await GetAsync()).Value!;
        SaveSiteDraftCommand command = TextsFrom(editor.Draft, editor.Version);
        command.InstagramUrl = "instagram.com/ocak";

        var result = await SaveAsync(command);

        Assert.False(result.IsSuccess);
        Assert.Contains("https://", result.Error);
        Assert.Null((await DbContext.Companies.AsNoTracking().FirstAsync(c => c.Id == _company.Id)).SiteDraft);
    }

    [Fact]
    public async Task UploadToDraft_DoesNotTouchPublished_ReUploadDeletesDraftOnlyFile()
    {
        await SeedAsync();

        var first = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Cover, Content = new MemoryStream([1]) }, "site/kapak-1.webp");
        Assert.True(first.IsSuccess, first.Error);
        Assert.Equal("https://cdn.test/site/kapak-1.webp", first.Value!.Draft.CoverImageUrl);
        Assert.Equal("https://cdn.test/site/eski-kapak.webp", first.Value.Published.CoverImageUrl);
        Assert.Equal(["coverImage"], first.Value.Changes.Select(c => c.Field));
        Assert.Empty(_storage.DeletedKeys); // yayındaki kapak taslakta değişti ama hâlâ yayında
        Assert.Equal(2000, _storage.LastMaxSize);

        var second = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Cover, Content = new MemoryStream([1]) }, "site/kapak-2.webp");
        Assert.True(second.IsSuccess, second.Error);
        Assert.Equal(["site/kapak-1.webp"], _storage.DeletedKeys); // yalnız taslağa yüklenmiş ilk dosya
        Assert.Equal("https://cdn.test/site/eski-kapak.webp", (await PublicSiteAsync()).Site.CoverImageUrl);
    }

    [Fact]
    public async Task Publish_DeletesReplacedOwnFiles_NeverShared()
    {
        await SeedAsync();
        // Kapak: hazır görsel; hikâye fotoğrafı: yeni yükleme; galeri: hazır görsel.
        Assert.True((await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Cover, StockImageId = _stock.Id })).IsSuccess);
        Assert.True((await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.About, Content = new MemoryStream([1]) }, "site/hikaye-2.webp")).IsSuccess);
        var editor = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Gallery, StockImageId = _stock.Id });
        Assert.True(editor.IsSuccess, editor.Error);
        Assert.Empty(_storage.DeletedKeys);

        var published = await PublishAsync(editor.Value!.Version);

        Assert.True(published.IsSuccess, published.Error);
        PublicSiteDto site = await PublicSiteAsync();
        Assert.Equal($"https://cdn.test/{StockKey}", site.Site.CoverImageUrl);
        Assert.Equal("https://cdn.test/site/hikaye-2.webp", site.Site.AboutImageUrl);
        Assert.Equal([$"https://cdn.test/{StockKey}"], site.Site.GalleryImageUrls);
        Assert.Equal(["site/eski-kapak.webp", "site/hikaye.webp"], _storage.DeletedKeys.Order());

        // Hazır kapak da kaldırılıp yayınlanırsa paylaşılan dosya silinmez.
        await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Cover });
        var removedGallery = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Gallery, GalleryIndex = 0 });
        Assert.True(removedGallery.IsSuccess, removedGallery.Error);
        Assert.True((await PublishAsync(removedGallery.Value!.Version)).IsSuccess);
        Assert.DoesNotContain(_storage.DeletedKeys, k => k.StartsWith("shared/", StringComparison.Ordinal));
        Assert.Equal(string.Empty, (await PublicSiteAsync()).Site.CoverImageUrl);
    }

    [Fact]
    public async Task Discard_DeletesDraftOnlyUploads_KeepsPublished_AndLogs()
    {
        await SeedAsync();
        await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Cover, Content = new MemoryStream([1]) }, "site/kapak-yeni.webp");
        await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Founder, StockImageId = _stock.Id });
        var editor = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Region, RegionId = _salon.Id, Content = new MemoryStream([1]) }, "site/salon.webp");
        Assert.Equal(3, editor.Value!.Changes.Count);
        Assert.Equal($"region:{_salon.Id}", editor.Value.Changes[^1].Field);
        Assert.Equal("Bölüm · Salon", editor.Value.Changes[^1].Label);

        // jsonb dönüştürücüsünden geçen taslak (izlemesiz okuma) aynı değerleri taşır.
        Company stored = await DbContext.Companies.AsNoTracking().FirstAsync(c => c.Id == _company.Id);
        Assert.Equal("site/kapak-yeni.webp", stored.SiteDraft!.CoverImage);
        Assert.Equal(StockKey, stored.SiteDraft.Content.FounderPhoto);
        Assert.Equal("site/salon.webp", Assert.Single(stored.SiteDraft.Content.RegionDetails).PhotoKey);
        Assert.Equal("Közde pişen et.", stored.SiteDraft.Tagline);
        Assert.Equal(editor.Value.Version, stored.SiteDraftVersion);

        var discarded = await DiscardAsync(editor.Value.Version);

        Assert.True(discarded.IsSuccess, discarded.Error);
        Assert.False(discarded.Value!.Editor.HasChanges);
        Assert.Equal("https://cdn.test/site/eski-kapak.webp", discarded.Value.Editor.Draft.CoverImageUrl);
        Assert.Equal(["site/kapak-yeni.webp", "site/salon.webp"], _storage.DeletedKeys.Order());
        Assert.Single(DbContext.AuditLogs.Where(a => a.Action == "SiteDraftDiscarded"));
    }

    [Fact]
    public async Task Revert_RestoresPublishedValue_AndDeletesDraftUpload()
    {
        await SeedAsync();
        await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Cover, Content = new MemoryStream([1]) }, "site/kapak-yeni.webp");
        SiteEditorDto editor = (await GetAsync()).Value!;
        SaveSiteDraftCommand command = TextsFrom(editor.Draft, editor.Version);
        command.Tagline = "Yeni alt başlık";
        editor = (await SaveAsync(command)).Value!.Editor;
        Assert.Equal(2, editor.Changes.Count);

        var reverted = await new RevertSiteDraftFieldsCommandHandler(Db, Owner, _storage, Cdn, Seo, TimeProvider.System)
            .Handle(new RevertSiteDraftFieldsCommand { Version = editor.Version, Fields = ["coverImage"] }, CancellationToken.None);

        Assert.True(reverted.IsSuccess, reverted.Error);
        Assert.Equal(["tagline"], reverted.Value!.Editor.Changes.Select(c => c.Field));
        Assert.Equal("https://cdn.test/site/eski-kapak.webp", reverted.Value.Editor.Draft.CoverImageUrl);
        Assert.Equal(["site/kapak-yeni.webp"], _storage.DeletedKeys);
    }

    [Fact]
    public async Task StockImage_UnknownOrInactive_Fails_GalleryReplaceKeepsOrder()
    {
        await SeedAsync();
        var unknown = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Share, StockImageId = Guid.NewGuid() });
        Assert.False(unknown.IsSuccess);

        await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Gallery, Content = new MemoryStream([1]) }, "site/g1.webp");
        await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Gallery, Content = new MemoryStream([1]) }, "site/g2.webp");
        var replaced = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Gallery, GalleryIndex = 0, StockImageId = _stock.Id });

        Assert.True(replaced.IsSuccess, replaced.Error);
        Assert.Equal([$"https://cdn.test/{StockKey}", "https://cdn.test/site/g2.webp"], replaced.Value!.Draft.GalleryImageUrls);
        Assert.Equal(["site/g1.webp"], _storage.DeletedKeys);

        var share = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Share, StockImageId = _stock.Id });
        Assert.Equal($"https://cdn.test/{StockKey}", share.Value!.Seo.ShareImageUrl);
        Assert.False(share.Value.Seo.ShareImageIsAuto);
    }

    [Fact]
    public async Task RegionImage_ForeignRegion_Fails()
    {
        await SeedAsync();

        var result = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Region, RegionId = Guid.NewGuid(), StockImageId = _stock.Id });

        Assert.False(result.IsSuccess);
        Assert.Equal("Bölüm bulunamadı.", result.Error);
    }

    // ── Alt sayfa kapakları (Menü, Hakkımızda, Mekân, İletişim, Rezervasyon) ─────────────────────────

    [Fact]
    public async Task HeroImage_GoesToDraft_ListedAsChange_PublicUnchangedUntilPublish()
    {
        await SeedAsync();

        var result = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.MenuHero, Content = new MemoryStream([1]) }, "site/menu-kapak.webp");

        Assert.True(result.IsSuccess, result.Error);
        SiteEditorDto editor = result.Value!;
        Assert.Equal("https://cdn.test/site/menu-kapak.webp", editor.Draft.MenuHeroUrl);
        Assert.Equal(string.Empty, editor.Published.MenuHeroUrl);
        Assert.Equal(string.Empty, editor.Draft.AboutHeroUrl);
        SiteChangeDto change = Assert.Single(editor.Changes);
        Assert.Equal("heroMenu", change.Field);
        Assert.Equal("Menü kapağı", change.Label);
        Assert.Equal(2000, _storage.LastMaxSize);
        Assert.Equal(string.Empty, (await PublicSiteAsync()).Site.MenuHeroUrl);

        var published = await PublishAsync(editor.Version);

        Assert.True(published.IsSuccess, published.Error);
        Assert.Equal("https://cdn.test/site/menu-kapak.webp", (await PublicSiteAsync()).Site.MenuHeroUrl);
        Assert.Empty(_storage.DeletedKeys);
    }

    [Fact]
    public async Task HeroImage_Stock_NeverDeleted_UploadReplacedTwice_DeletesOnlyUnusedDraftFile()
    {
        await SeedAsync();

        await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.VenueHero, Content = new MemoryStream([1]) }, "site/mekan-1.webp");
        var stock = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.VenueHero, StockImageId = _stock.Id });

        Assert.True(stock.IsSuccess, stock.Error);
        Assert.Equal($"https://cdn.test/{StockKey}", stock.Value!.Draft.VenueHeroUrl);
        Assert.Equal(["site/mekan-1.webp"], _storage.DeletedKeys); // ilk taslak yüklemesi hiçbir yerde kullanılmıyor

        var removed = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.VenueHero });
        Assert.True(removed.IsSuccess, removed.Error);
        Assert.Equal(string.Empty, removed.Value!.Draft.VenueHeroUrl);
        Assert.DoesNotContain(_storage.DeletedKeys, k => k.StartsWith("shared/", StringComparison.Ordinal));
    }

    [Fact]
    public async Task HeroImage_PublishedThenReplaced_OldFileDeletedOnPublish_RevertAndDiscardKeepPublished()
    {
        await SeedAsync();
        var first = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.ContactHero, Content = new MemoryStream([1]) }, "site/iletisim-1.webp");
        await PublishAsync(first.Value!.Version);

        // Taslakta değişir: yayındaki dosya hâlâ yayında olduğu için silinmez.
        var second = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.ContactHero, Content = new MemoryStream([1]) }, "site/iletisim-2.webp");
        Assert.Empty(_storage.DeletedKeys);

        // Geri al: taslağa yüklenen dosya artık kullanılmaz ve silinir; yayındaki kalır.
        var reverted = await new RevertSiteDraftFieldsCommandHandler(Db, Owner, _storage, Cdn, Seo, TimeProvider.System)
            .Handle(new RevertSiteDraftFieldsCommand { Version = second.Value!.Version, Fields = ["heroContact"] }, CancellationToken.None);
        Assert.True(reverted.IsSuccess, reverted.Error);
        Assert.Equal("https://cdn.test/site/iletisim-1.webp", reverted.Value!.Editor.Draft.ContactHeroUrl);
        Assert.Equal(["site/iletisim-2.webp"], _storage.DeletedKeys);

        // Yeniden değiştirip yayınla: yayından kalkan ilk dosya silinir.
        var third = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.ContactHero, Content = new MemoryStream([1]) }, "site/iletisim-3.webp");
        await PublishAsync(third.Value!.Version);
        Assert.Equal(["site/iletisim-1.webp", "site/iletisim-2.webp"], _storage.DeletedKeys.Order());
        Assert.Equal("https://cdn.test/site/iletisim-3.webp", (await PublicSiteAsync()).Site.ContactHeroUrl);

        // Taslakta kaldırıp atınca yayındaki dosya kalır.
        var cleared = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.ContactHero });
        var discarded = await DiscardAsync(cleared.Value!.Version);
        Assert.True(discarded.IsSuccess, discarded.Error);
        Assert.DoesNotContain("site/iletisim-3.webp", _storage.DeletedKeys);
        Assert.Equal("https://cdn.test/site/iletisim-3.webp", discarded.Value!.Editor.Draft.ContactHeroUrl);
    }

    [Fact]
    public async Task Completeness_Draft_ScoresDraft_PublishedUnchanged()
    {
        await SeedAsync();
        SiteEditorDto editor = (await GetAsync()).Value!;
        SaveSiteDraftCommand command = TextsFrom(editor.Draft, editor.Version);
        command.InstagramUrl = "https://instagram.com/ocak";
        await SaveAsync(command);

        var handler = new GetSiteCompletenessQueryHandler(Db, Owner);
        SiteCompletenessDto published = (await handler.Handle(new GetSiteCompletenessQuery(), CancellationToken.None)).Value!;
        SiteCompletenessDto draft = (await handler.Handle(new GetSiteCompletenessQuery { Draft = true }, CancellationToken.None)).Value!;

        Assert.False(published.Items.Single(i => i.Key == "instagram").Done);
        Assert.True(draft.Items.Single(i => i.Key == "instagram").Done);
        Assert.True(draft.Score > published.Score);
    }

    // ── Şirket geneli site: yetki, şubeye ait alanlar, çok şubeli şirket ─────────────────────────────

    [Fact]
    public async Task Admin_CannotOpenOrEditSite()
    {
        await SeedAsync();
        // Varsayılan test kullanıcısı şube yöneticisi (Admin).
        var get = await new GetSiteEditorQueryHandler(Db, CurrentUser, Cdn, Seo).Handle(new GetSiteEditorQuery(), CancellationToken.None);
        var save = await new SaveSiteDraftCommandHandler(Db, CurrentUser, _storage, Cdn, Seo, TimeProvider.System)
            .Handle(new SaveSiteDraftCommand { Headline = "Yönetici" }, CancellationToken.None);
        var image = await new SetSiteDraftImageCommandHandler(Db, CurrentUser, _storage, Cdn, Seo, TimeProvider.System)
            .Handle(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Cover, StockImageId = _stock.Id }, CancellationToken.None);
        var completeness = await new GetSiteCompletenessQueryHandler(Db, CurrentUser).Handle(new GetSiteCompletenessQuery(), CancellationToken.None);

        Assert.False(get.IsSuccess);
        Assert.False(save.IsSuccess);
        Assert.False(image.IsSuccess);
        Assert.False(completeness.IsSuccess);
        Assert.Null((await DbContext.Companies.AsNoTracking().FirstAsync(c => c.Id == _company.Id)).SiteDraft);
    }

    [Fact]
    public async Task OtherCompanysOwner_CannotEditThisSite()
    {
        await SeedAsync();
        var stranger = new FakeCurrentUserService { Role = "Owner", CompanyId = CurrentUser.CompanyId, BranchId = CurrentUser.CompanyId };

        var get = await new GetSiteEditorQueryHandler(Db, stranger, Cdn, Seo).Handle(new GetSiteEditorQuery(), CancellationToken.None);

        Assert.False(get.IsSuccess); // şirketin sahibi o değil
    }

    [Fact]
    public async Task BranchInfo_InSaveBody_IsIgnored_PreviewShowsPrimaryBranch()
    {
        await SeedAsync();
        _branch.UpdateSiteInfo(new TimeOnly(9, 0), new TimeOnly(23, 0), "Pazartesi kapalı.", [], "0532 000 48 48", "Metroya 4 dk.");
        await DbContext.SaveChangesAsync();

        SiteEditorDto editor = (await GetAsync()).Value!;
        Assert.Equal("0532 000 48 48", editor.Draft.WhatsappPhone); // önizleme varsayılan şubeyle
        Assert.Equal("09:00", editor.Draft.OpensAt);

        SaveSiteDraftCommand command = TextsFrom(editor.Draft, editor.Version);
        command.Tagline = "Yeni alt başlık";
        command.WhatsappPhone = "0544 111 11 11";
        command.HoursNote = "Taslakta değişmez";
        command.OpensAt = "10:00";
        SiteEditorDto saved = (await SaveAsync(command)).Value!.Editor;

        Assert.Equal(["tagline"], saved.Changes.Select(c => c.Field));
        Assert.Equal("0532 000 48 48", saved.Draft.WhatsappPhone);
        Company stored = await DbContext.Companies.AsNoTracking().FirstAsync(c => c.Id == _company.Id);
        Assert.Equal(string.Empty, stored.SiteDraft!.Content.WhatsappPhone);
        Assert.Null(stored.SiteDraft.OpensAt);
        Branch branch = await DbContext.Branches.AsNoTracking().FirstAsync(b => b.Id == _branch.Id);
        Assert.Equal("0532 000 48 48", branch.GetSiteContent().WhatsappPhone); // şube değişmedi
        Assert.Equal(new TimeOnly(9, 0), branch.OpensAt);
    }

    [Fact]
    public async Task MultiBranch_OneSite_EachBranchKeepsOwnHoursAndWhatsapp()
    {
        await SeedAsync();
        _branch.UpdateSiteInfo(null, null, "", [], "0532 000 48 48", "");
        Branch second = Branch.Create(_company.Id, "Kadıköy", "", "", "", "İstanbul", "Kadıköy", "Bahariye Cd. 5", 10m);
        second.UpdateSiteInfo(new TimeOnly(12, 0), new TimeOnly(2, 0), "", [], "0544 222 22 22", "İskeleye 3 dk.");
        DbContext.Branches.Add(second);
        await DbContext.SaveChangesAsync();
        Region terrace = await SeedRegionAsync(second.Id);
        DbContext.Tables.Add(Table.Create("T1", "", terrace.Id));
        await DbContext.SaveChangesAsync();

        // Editör iki şubenin bölümlerini şube adıyla gösterir; ikinci şubenin bölümüne fotoğraf konabilir.
        SiteEditorDto editor = (await GetAsync()).Value!;
        Assert.Equal(["Moda · Salon", "Kadıköy · Salon"], editor.Draft.RegionDetails.Select(r => r.Name));
        var photo = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Region, RegionId = terrace.Id, StockImageId = _stock.Id });
        Assert.True(photo.IsSuccess, photo.Error);
        SaveSiteDraftCommand command = TextsFrom(photo.Value!.Draft, photo.Value.Version);
        command.Headline = "Tek site";
        int version = (await SaveAsync(command)).Value!.Editor.Version;
        Assert.True((await PublishAsync(version)).IsSuccess);

        var first = await new GetPublicSiteQueryHandler(Db, _tenant, Cdn).Handle(new GetPublicSiteQuery(), CancellationToken.None);
        var other = await new GetPublicSiteQueryHandler(Db, _tenant, Cdn).Handle(new GetPublicSiteQuery { BranchId = second.Id }, CancellationToken.None);

        Assert.Equal("Tek site", first.Value!.Site.Headline);
        Assert.Equal("Tek site", other.Value!.Site.Headline); // aynı site
        Assert.Equal("0532 000 48 48", first.Value.Site.WhatsappPhone);
        Assert.Equal("0544 222 22 22", other.Value.Site.WhatsappPhone); // şubenin kendi WhatsApp'ı
        Assert.Equal("12:00", other.Value.Site.OpensAt);
        Assert.Equal("İskeleye 3 dk.", other.Value.Site.DirectionsNote);
        Assert.Equal("https://cdn.test/" + StockKey, Assert.Single(other.Value.Regions).PhotoUrl);
    }

    [Fact]
    public async Task RegionPhoto_OtherCompanysRegion_IsRejected()
    {
        await SeedAsync();
        Branch foreign = Branch.Create(Guid.NewGuid(), "Başka", "", "", "", "", "", "", 10m);
        DbContext.Branches.Add(foreign);
        await DbContext.SaveChangesAsync();
        Region foreignRegion = await SeedRegionAsync(foreign.Id);

        var result = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Region, RegionId = foreignRegion.Id, StockImageId = _stock.Id });

        Assert.False(result.IsSuccess);
        Assert.Equal("Bölüm bulunamadı.", result.Error);
    }

    [Fact]
    public async Task Upload_IsStoredUnderCompanyFolder()
    {
        await SeedAsync();
        await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Cover, Content = new MemoryStream([1]) }, "site/kapak-yeni.webp");

        Assert.Equal(_company.Id, _storage.LastBranchId);
    }

    [Fact]
    public async Task Logo_UploadsSmall_ReachesPublicSiteOnPublish_StockRejected()
    {
        await SeedAsync();

        var stock = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Logo, StockImageId = _stock.Id });
        Assert.False(stock.IsSuccess);

        var editor = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.Logo, Content = new MemoryStream([1]) }, "site/logo.webp");
        Assert.True(editor.IsSuccess, editor.Error);
        Assert.Equal(512, _storage.LastMaxSize);
        SiteChangeDto change = Assert.Single(editor.Value!.Changes);
        Assert.Equal("logo", change.Field);
        Assert.Equal("Logo", change.Label);
        Assert.Equal(string.Empty, (await PublicSiteAsync()).Site.LogoUrl);

        // jsonb dönüştürücüsünden geçen taslak logoyu taşır.
        Company stored = await DbContext.Companies.AsNoTracking().FirstAsync(c => c.Id == _company.Id);
        Assert.Equal("site/logo.webp", stored.SiteDraft!.LogoImage);

        var published = await PublishAsync(editor.Value.Version);
        Assert.True(published.IsSuccess, published.Error);
        Assert.EndsWith("/site/logo.webp", (await PublicSiteAsync()).Site.LogoUrl);
    }

    // ── Ekibimiz ────────────────────────────────────────────────────────────────────────────────────

    private static readonly Guid Ayse = Guid.Parse("a1111111-1111-1111-1111-111111111111");
    private static readonly Guid Mehmet = Guid.Parse("b2222222-2222-2222-2222-222222222222");

    private static SiteTeamMemberDto Member(Guid id, string name, string role = "", string note = "")
        => new() { Id = id, Name = name, Role = role, Note = note };

    /// <summary>Taslağın son hâlinden metin kaydı: ekibi <paramref name="team"/> ile değiştirir.</summary>
    private async Task<SiteEditorDto> SaveTeamAsync(params SiteTeamMemberDto[] team)
    {
        SiteEditorDto editor = (await GetAsync()).Value!;
        SaveSiteDraftCommand command = TextsFrom(editor.Draft, editor.Version);
        command.TeamMembers = [.. team];
        var saved = await SaveAsync(command);
        Assert.True(saved.IsSuccess, saved.Error);
        return saved.Value!.Editor;
    }

    private Task<Result<SiteEditorDto>> TeamPhotoAsync(Guid memberId, string? nextKey)
        => ImageAsync(new SetSiteDraftImageCommand
        {
            Target = SiteDraftImageTarget.TeamMember, TeamMemberId = memberId, Content = nextKey is null ? null : new MemoryStream([1]),
        }, nextKey);

    [Fact]
    public async Task Team_TextSave_KeepsPhotoById_WhenEditedAndReordered()
    {
        await SeedAsync();
        await SaveTeamAsync(Member(Ayse, "Ayşe Usta", "Mutfak şefi"), Member(Mehmet, "Mehmet Kaya", "Ocakbaşı ustası"));

        var photo = await TeamPhotoAsync(Mehmet, "site/mehmet.webp");
        Assert.True(photo.IsSuccess, photo.Error);
        Assert.Equal(1000, _storage.LastMaxSize);

        // Sıra değişir, yazılar düzenlenir: fotoğraf Mehmet'te kalır, Ayşe'ye geçmez.
        SiteEditorDto after = await SaveTeamAsync(Member(Mehmet, "  Mehmet Kaya ", "Usta", "Kömürü kendi seçer."), Member(Ayse, "Ayşe Usta", "Mutfak şefi"));

        Assert.Equal([Mehmet, Ayse], after.Draft.TeamMembers.Select(m => m.Id));
        Assert.Equal("Mehmet Kaya", after.Draft.TeamMembers[0].Name);
        Assert.Equal("Kömürü kendi seçer.", after.Draft.TeamMembers[0].Note);
        Assert.Equal("https://cdn.test/site/mehmet.webp", after.Draft.TeamMembers[0].PhotoUrl);
        Assert.Equal(string.Empty, after.Draft.TeamMembers[1].PhotoUrl);
        Assert.Empty(_storage.DeletedKeys);
        Assert.Contains(after.Changes, c => c.Field == "teamMembers" && c.Label == "Ekibimiz" && c.Page == "Hakkımızda");

        // Eski form ekibi göndermez (null): ekip olduğu gibi kalır.
        SaveSiteDraftCommand legacy = TextsFrom(after.Draft, after.Version);
        legacy.TeamMembers = null;
        legacy.TeamTitle = null;
        SiteEditorDto kept = (await SaveAsync(legacy)).Value!.Editor;
        Assert.Equal(2, kept.Draft.TeamMembers.Count);
        Assert.Equal("https://cdn.test/site/mehmet.webp", kept.Draft.TeamMembers[0].PhotoUrl);
    }

    [Fact]
    public async Task Team_NamelessEntriesDropped_UnlessTheyHavePhoto_NewIdAssigned()
    {
        await SeedAsync();
        SiteEditorDto first = await SaveTeamAsync(Member(Ayse, "Ayşe Usta"), Member(Guid.NewGuid(), "   ", "Salon şefi", "Adı yok"), Member(Guid.Empty, "Zeynep Arslan"));

        Assert.Equal(["Ayşe Usta", "Zeynep Arslan"], first.Draft.TeamMembers.Select(m => m.Name));
        Assert.NotEqual(Guid.Empty, first.Draft.TeamMembers[1].Id);

        // Fotoğraflı üyenin adı silinirken (yeniden yazılacak) üye fotoğrafıyla kalır; sitede çizilmez (ön yüz).
        Assert.True((await TeamPhotoAsync(Ayse, "site/ayse.webp")).IsSuccess);
        SiteEditorDto cleared = await SaveTeamAsync(Member(Ayse, ""));
        SiteTeamMemberDto kept = Assert.Single(cleared.Draft.TeamMembers);
        Assert.Equal(string.Empty, kept.Name);
        Assert.Equal("https://cdn.test/site/ayse.webp", kept.PhotoUrl);
    }

    [Fact]
    public async Task Team_PhotoReplaceRemoveAndMemberDelete_DeleteUnusedFiles_PublishedKeptUntilPublish()
    {
        await SeedAsync();
        await SaveTeamAsync(Member(Ayse, "Ayşe Usta"), Member(Mehmet, "Mehmet Kaya"));
        await TeamPhotoAsync(Ayse, "site/ayse-1.webp");

        // Taslakta değişen fotoğrafın eski dosyası (yayında değil) silinir.
        await TeamPhotoAsync(Ayse, "site/ayse-2.webp");
        Assert.Equal(["site/ayse-1.webp"], _storage.DeletedKeys);

        // Fotoğrafı kaldır: dosya silinir, üye kalır.
        var removed = await TeamPhotoAsync(Ayse, null);
        Assert.True(removed.IsSuccess, removed.Error);
        Assert.Equal(string.Empty, removed.Value!.Draft.TeamMembers[0].PhotoUrl);
        Assert.Equal(["site/ayse-1.webp", "site/ayse-2.webp"], _storage.DeletedKeys.Order());

        // Yayındaki fotoğraf: üye taslaktan silinince dosya kalır (yayında), Yayınla'dan sonra silinir.
        SiteEditorDto withPhoto = (await TeamPhotoAsync(Mehmet, "site/mehmet.webp")).Value!;
        Assert.True((await PublishAsync(withPhoto.Version)).IsSuccess);
        Assert.Equal("https://cdn.test/site/mehmet.webp", (await PublicSiteAsync()).Site.TeamMembers.Single(m => m.Id == Mehmet).PhotoUrl);

        SiteEditorDto withoutMehmet = await SaveTeamAsync(Member(Ayse, "Ayşe Usta"));
        Assert.DoesNotContain("site/mehmet.webp", _storage.DeletedKeys);
        Assert.True((await PublishAsync(withoutMehmet.Version)).IsSuccess);
        Assert.Contains("site/mehmet.webp", _storage.DeletedKeys);
        Assert.Equal(["Ayşe Usta"], (await PublicSiteAsync()).Site.TeamMembers.Select(m => m.Name));
    }

    [Fact]
    public async Task Team_DeletingDraftOnlyMember_DeletesPhotoOnSave()
    {
        await SeedAsync();
        await SaveTeamAsync(Member(Ayse, "Ayşe Usta"), Member(Mehmet, "Mehmet Kaya"));
        await TeamPhotoAsync(Mehmet, "site/mehmet.webp");

        await SaveTeamAsync(Member(Ayse, "Ayşe Usta"));

        Assert.Equal(["site/mehmet.webp"], _storage.DeletedKeys);
    }

    [Fact]
    public async Task Team_Photo_UnknownMemberOrStock_RejectedWithoutUpload()
    {
        await SeedAsync();
        await SaveTeamAsync(Member(Ayse, "Ayşe Usta"));

        var unknown = await TeamPhotoAsync(Mehmet, "site/x.webp");
        Assert.False(unknown.IsSuccess);
        Assert.Equal("Ekip üyesi bulunamadı. Önce üyenin adını yazın.", unknown.Error);

        var stock = await ImageAsync(new SetSiteDraftImageCommand { Target = SiteDraftImageTarget.TeamMember, TeamMemberId = Ayse, StockImageId = _stock.Id });
        Assert.False(stock.IsSuccess);
        Assert.Empty(_storage.UploadedKeys);
    }

    [Fact]
    public async Task Team_TitleIntro_DraftThenPublish_AndRevert()
    {
        await SeedAsync();
        SiteEditorDto editor = (await GetAsync()).Value!;
        SaveSiteDraftCommand command = TextsFrom(editor.Draft, editor.Version);
        command.TeamTitle = "  Mutfağın ustaları ";
        command.TeamIntro = "Her akşam sizi ağırlayanlar.";
        command.TeamMembers = [Member(Ayse, "Ayşe Usta")];
        SiteEditorDto saved = (await SaveAsync(command)).Value!.Editor;

        Assert.Equal("Mutfağın ustaları", saved.Draft.TeamTitle);
        Assert.Equal(["teamTitle", "teamIntro", "teamMembers"], saved.Changes.Select(c => c.Field).Where(f => f.StartsWith("team", StringComparison.Ordinal)));
        Assert.Empty((await PublicSiteAsync()).Site.TeamMembers);

        var reverted = await new RevertSiteDraftFieldsCommandHandler(Db, Owner, _storage, Cdn, Seo, TimeProvider.System)
            .Handle(new RevertSiteDraftFieldsCommand { Version = saved.Version, Fields = ["teamIntro"] }, CancellationToken.None);
        Assert.True(reverted.IsSuccess, reverted.Error);
        Assert.Equal(string.Empty, reverted.Value!.Editor.Draft.TeamIntro);

        Assert.True((await PublishAsync(reverted.Value.Editor.Version)).IsSuccess);
        BranchSiteDto live = (await PublicSiteAsync()).Site;
        Assert.Equal("Mutfağın ustaları", live.TeamTitle);
        Assert.Equal("Ayşe Usta", Assert.Single(live.TeamMembers).Name);

        // jsonb dönüştürücüsünden geçen yayın ekibi taşır.
        Company stored = await DbContext.Companies.AsNoTracking().FirstAsync(c => c.Id == _company.Id);
        Assert.Equal(Ayse, Assert.Single(stored.GetPublishedSite().Content.TeamMembers).Id);
    }

    [Fact]
    public async Task Team_TooManyMembers_IsRejected()
    {
        await SeedAsync();
        SiteEditorDto editor = (await GetAsync()).Value!;
        SaveSiteDraftCommand command = TextsFrom(editor.Draft, editor.Version);
        command.TeamMembers = [.. Enumerable.Range(1, SiteContent.TeamMembersMax + 1).Select(i => Member(Guid.NewGuid(), "Üye " + i))];

        var result = await SaveAsync(command);

        Assert.False(result.IsSuccess);
        Assert.Equal("En fazla 6 ekip üyesi eklenebilir.", result.Error);
    }

    [Fact]
    public void Validator_Team_LimitsAndCount()
    {
        var validator = new SaveSiteDraftCommandValidator();
        Assert.False(validator.TestValidate(new SaveSiteDraftCommand { TeamMembers = [Member(Ayse, new string('a', SiteContent.TeamNameMaxLength + 1))] }).IsValid);
        Assert.False(validator.TestValidate(new SaveSiteDraftCommand { TeamMembers = [Member(Ayse, "Ayşe", new string('r', SiteContent.TeamRoleMaxLength + 1))] }).IsValid);
        Assert.False(validator.TestValidate(new SaveSiteDraftCommand { TeamMembers = [Member(Ayse, "Ayşe", "Şef", new string('n', SiteContent.TeamNoteMaxLength + 1))] }).IsValid);
        validator.TestValidate(new SaveSiteDraftCommand { TeamTitle = new string('t', SiteContent.TeamTitleMaxLength + 1) })
            .ShouldHaveValidationErrorFor(x => x.TeamTitle);
        validator.TestValidate(new SaveSiteDraftCommand { TeamIntro = new string('i', SiteContent.TeamIntroMaxLength + 1) })
            .ShouldHaveValidationErrorFor(x => x.TeamIntro);
        Assert.False(validator.TestValidate(new SaveSiteDraftCommand
        {
            TeamMembers = [.. Enumerable.Range(0, SiteContent.TeamMembersMax + 1).Select(_ => Member(Guid.NewGuid(), "Üye"))],
        }).IsValid);
        validator.TestValidate(new SaveSiteDraftCommand
        {
            TeamMembers = [Member(Ayse, new string('a', SiteContent.TeamNameMaxLength), "Şef", new string('n', SiteContent.TeamNoteMaxLength))],
            TeamTitle = new string('t', SiteContent.TeamTitleMaxLength),
        }).ShouldNotHaveAnyValidationErrors();
        validator.TestValidate(new SaveSiteDraftCommand { TeamMembers = null, TeamTitle = null }).ShouldNotHaveAnyValidationErrors();
    }
}
