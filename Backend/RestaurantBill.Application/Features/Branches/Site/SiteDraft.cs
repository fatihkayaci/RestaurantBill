using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Features.CustomerSite.Seo;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Branches.Site;

// Görsel site düzenleyicisi: Taslak + Yayınla. Site şirket genelidir; yalnız sahip düzenler. Bütün değişiklikler şirketin
// SiteDraft sütununa gider; müşteri sitesi yayındaki hâli (Company.Site) okumaya devam eder. Yayınla taslağı yayına kopyalar,
// "Değişiklikleri at" taslağı siler. Şubeye ait alanlar (saatler, WhatsApp, nasıl gelinir) taslağa girmez: önizlemede
// varsayılan şubenin (en eski) değerleriyle gösterilir, şubenin Ayarlar'ından değişir.
// Fotoğraf kuralı: bir dosya ancak ne yayında ne taslakta kullanılıyorsa silinir; shared/ (hazır görsel) hiç silinmez.
// Sözleşme: docs/site-editor.md.

public static class SiteEditorMessages
{
    /// <summary>409 yanıtının mesajı: ön yüz "Başkası da düzenledi" uyarısını ve "Son hâli yükle"yi gösterir.</summary>
    public const string Conflict = "Site başka bir oturumda da düzenlendi. Son hâli yükleyip tekrar deneyin.";
}

internal static class SiteEditor
{

    private static readonly Dictionary<string, (string Label, string Page)> Fields = new()
    {
        ["logo"] = ("Logo", "Tema"),
        ["headline"] = ("Başlık", "Anasayfa"),
        ["tagline"] = ("Alt başlık", "Anasayfa"),
        ["coverImage"] = ("Kapak fotoğrafı", "Anasayfa"),
        ["storyTitle"] = ("Hikâye başlığı", "Anasayfa"),
        ["about"] = ("Hikâye metni", "Anasayfa"),
        ["aboutImage"] = ("Hikâye fotoğrafı", "Anasayfa"),
        ["hours"] = ("Çalışma saatleri", "İletişim"),
        ["hoursNote"] = ("Saat notu", "İletişim"),
        ["instagramUrl"] = ("Instagram", "İletişim"),
        ["directionsNote"] = ("Nasıl gelinir", "İletişim"),
        ["whatsappPhone"] = ("WhatsApp", "İletişim"),
        ["design"] = ("Tasarım", "Tema"),
        ["font"] = ("Yazı tipi", "Tema"),
        ["theme"] = ("Tema", "Tema"),
        ["accentColor"] = ("Vurgu rengi", "Tema"),
        ["gallery"] = ("Mekân fotoğrafları", "Mekân"),
        ["amenities"] = ("Olanaklar", "Mekân"),
        ["hiddenFaqs"] = ("Sık sorulanlar", "İletişim"),
        ["homeSections"] = ("Anasayfa bölümleri", "Anasayfa"),
        ["rating"] = ("Google puanı", "Anasayfa"),
        ["reviewCount"] = ("Yorum sayısı", "Anasayfa"),
        ["reviewsUrl"] = ("Yorum bağlantısı", "Anasayfa"),
        ["featuredReviews"] = ("Misafir yorumları", "Anasayfa"),
        ["founderPhoto"] = ("Usta fotoğrafı", "Hakkımızda"),
        ["founderName"] = ("Ustanın adı", "Hakkımızda"),
        ["founderTitle"] = ("Ustanın unvanı", "Hakkımızda"),
        ["founderQuote"] = ("Ustanın sözü", "Hakkımızda"),
        ["foundedYear"] = ("Kuruluş yılı", "Hakkımızda"),
        ["values"] = ("Değerlerimiz", "Hakkımızda"),
        ["milestones"] = ("Kilometre taşları", "Hakkımızda"),
        ["teamTitle"] = ("Ekip başlığı", "Hakkımızda"),
        ["teamIntro"] = ("Ekip giriş yazısı", "Hakkımızda"),
        ["teamMembers"] = ("Ekibimiz", "Hakkımızda"),
        ["seoTitle"] = ("Sayfa başlığı", "Google ve paylaşım"),
        ["seoDescription"] = ("Açıklama", "Google ve paylaşım"),
        ["shareImage"] = ("Paylaşım görseli", "Google ve paylaşım"),
        ["heroMenu"] = ("Menü kapağı", "Menü"),
        ["heroAbout"] = ("Hakkımızda kapağı", "Hakkımızda"),
        ["heroVenue"] = ("Mekân kapağı", "Mekân"),
        ["heroContact"] = ("İletişim kapağı", "İletişim"),
        ["heroReservation"] = ("Rezervasyon kapağı", "Rezervasyon"),
    };

    public static bool IsKnownField(string field)
        => Fields.ContainsKey(field)
           || (field.StartsWith(SiteSnapshot.RegionFieldPrefix, StringComparison.Ordinal)
               && Guid.TryParse(field[SiteSnapshot.RegionFieldPrefix.Length..], out _));

    public static Task<Company?> LoadAsync(IAppDbContext db, ICurrentUserService currentUser, CancellationToken cancellationToken)
        => CompanySiteLoader.LoadAsync(db, currentUser, cancellationToken);

    public static async Task<SiteEditorDto> BuildAsync(IAppDbContext db, Company company, string cdnBaseUrl, SeoOptions seoOptions,
        CancellationToken cancellationToken)
    {
        Branch? primary = await CompanySiteLoader.PrimaryBranchAsync(db, company.Id, cancellationToken);
        List<CompanySiteLoader.RegionRow> regions = await CompanySiteLoader.RegionsAsync(db, company.Id, cancellationToken);

        SiteSnapshot draft = company.GetSiteDraft();
        SiteSnapshot published = company.GetPublishedSite();
        // Önizleme ve SEO'nun otomatik metni varsayılan şubenin saatleri, ilçesi ve WhatsApp'ıyla.
        SiteSnapshot draftView = CompanySiteLoader.WithBranch(draft, primary);
        SiteSnapshot publishedView = CompanySiteLoader.WithBranch(published, primary);
        SiteSeoValues seo = SiteSeo.Resolve(draftView, company.Name, primary?.BranchName ?? string.Empty, primary?.District ?? string.Empty);
        string rootDomain = seoOptions.RootDomain.Trim().Trim('.');

        List<SiteChangeDto> changes = draft.ChangedFields(published).Select(field =>
        {
            if (Fields.TryGetValue(field, out var meta)) return new SiteChangeDto { Field = field, Label = meta.Label, Page = meta.Page };
            Guid.TryParse(field[SiteSnapshot.RegionFieldPrefix.Length..], out Guid regionId);
            string name = regions.FirstOrDefault(r => r.Id == regionId)?.Name ?? "Silinmiş bölüm";
            return new SiteChangeDto { Field = field, Label = $"Bölüm · {name}", Page = "Mekân" };
        }).ToList();

        return new SiteEditorDto
        {
            Version = company.SiteDraftVersion,
            HasChanges = changes.Count > 0,
            Changes = changes,
            DraftUpdatedAt = company.SiteDraftUpdatedAt,
            PublishedAt = company.SitePublishedAt,
            Draft = CompanySiteLoader.ToAdminDto(draftView, regions, cdnBaseUrl),
            Published = CompanySiteLoader.ToAdminDto(publishedView, regions, cdnBaseUrl),
            Seo = new SiteEditorSeoDto
            {
                Title = seo.Title,
                Description = seo.Description,
                ShareImageUrl = BranchSiteDto.ImageUrl(cdnBaseUrl, seo.ShareImageKey),
                AutoTitle = seo.AutoTitle,
                AutoDescription = seo.AutoDescription,
                AutoShareImageUrl = BranchSiteDto.ImageUrl(cdnBaseUrl, seo.AutoShareImageKey),
                TitleIsAuto = draft.Content.SeoTitle.Length == 0,
                DescriptionIsAuto = draft.Content.SeoDescription.Length == 0,
                ShareImageIsAuto = draft.Content.ShareImage.Length == 0,
                PageTitles = SiteSeo.Pages.ToDictionary(p => p.Path, p => SiteSeo.PageTitle(p.Path, seo.RestaurantName, seo.Title).Title),
            },
            SiteUrl = !string.IsNullOrWhiteSpace(company.Slug) && rootDomain.Length > 0 ? $"https://{company.Slug}.{rootDomain}" : string.Empty,
        };
    }

    public static async Task<Result<SiteDraftResultDto>> ConflictAsync(IAppDbContext db, Company company, string cdnBaseUrl, SeoOptions seoOptions,
        CancellationToken cancellationToken)
        => Result<SiteDraftResultDto>.Success(new SiteDraftResultDto
        {
            Conflict = true,
            Editor = await BuildAsync(db, company, cdnBaseUrl, seoOptions, cancellationToken),
        });

    public static async Task<Result<SiteDraftResultDto>> OkAsync(IAppDbContext db, Company company, string cdnBaseUrl, SeoOptions seoOptions,
        CancellationToken cancellationToken)
        => Result<SiteDraftResultDto>.Success(new SiteDraftResultDto
        {
            Editor = await BuildAsync(db, company, cdnBaseUrl, seoOptions, cancellationToken),
        });

    /// <summary>Denetim kaydı şube kapsamlıdır: site kaydı varsayılan şubeye yazılır (Denetim Kaydı'nda görünsün diye).</summary>
    public static async Task AddAuditLogAsync(IAppDbContext db, ICurrentUserService currentUser, Company company, string action, string messageTail,
        CancellationToken cancellationToken)
    {
        Branch? primary = await CompanySiteLoader.PrimaryBranchAsync(db, company.Id, cancellationToken);
        if (primary is null) return;
        User? actor = await db.Users.FirstOrDefaultAsync(u => u.Id == currentUser.UserId, cancellationToken);
        db.AuditLogs.Add(AuditLog.Create(
            primary.Id,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            AuditLogSeverity.Info,
            action,
            $"{actor?.FullName} {messageTail}",
            nameof(Company),
            company.Id));
    }

    public static string Labels(SiteEditorDto editor) => string.Join(", ", editor.Changes.Select(c => c.Label));
}

// ── Düzenleyiciyi aç ────────────────────────────────────────────────────────────────────────────
public class GetSiteEditorQuery : IRequest<Result<SiteEditorDto>>
{
}

public class GetSiteEditorQueryHandler(
    IAppDbContext db, ICurrentUserService currentUser, IOptions<BunnyStorageOptions> storageOptions, IOptions<SeoOptions> seoOptions)
    : IRequestHandler<GetSiteEditorQuery, Result<SiteEditorDto>>
{
    public async Task<Result<SiteEditorDto>> Handle(GetSiteEditorQuery request, CancellationToken cancellationToken)
    {
        Company? company = await CompanySiteLoader.LoadAsync(db, currentUser, cancellationToken, tracking: false);
        if (company is null) return Result<SiteEditorDto>.Failure(CompanySiteLoader.NotFoundMessage);
        return Result<SiteEditorDto>.Success(
            await SiteEditor.BuildAsync(db, company, CompanySiteLoader.Cdn(storageOptions), seoOptions.Value, cancellationToken));
    }
}

// ── Taslağın metinlerini kaydet ─────────────────────────────────────────────────────────────────
/// <summary>Taslağın bütün metinleri (fotoğraflar ayrı uçlardan). Version: son okunan sürüm; eskiyse çatışma döner.</summary>
public class SaveSiteDraftCommand : SiteTextsInput, IRequest<Result<SiteDraftResultDto>>
{
    public int Version { get; set; }
    /// <summary>Boş = otomatik; null = değiştirme.</summary>
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
}

public class SaveSiteDraftCommandValidator : SiteTextsValidator<SaveSiteDraftCommand>
{
    public SaveSiteDraftCommandValidator()
    {
        RuleFor(x => x.SeoTitle).MaximumLength(SiteContent.SeoTitleMaxLength)
            .WithMessage($"Sayfa başlığı en fazla {SiteContent.SeoTitleMaxLength} karakter olabilir.");
        RuleFor(x => x.SeoDescription).MaximumLength(SiteContent.SeoDescriptionMaxLength)
            .WithMessage($"Açıklama en fazla {SiteContent.SeoDescriptionMaxLength} karakter olabilir.");
    }
}

public class SaveSiteDraftCommandHandler(
    IAppDbContext db, ICurrentUserService currentUser, IImageStorageService imageStorage, IOptions<BunnyStorageOptions> storageOptions,
    IOptions<SeoOptions> seoOptions, TimeProvider clock)
    : IRequestHandler<SaveSiteDraftCommand, Result<SiteDraftResultDto>>
{
    public async Task<Result<SiteDraftResultDto>> Handle(SaveSiteDraftCommand request, CancellationToken cancellationToken)
    {
        Company? company = await SiteEditor.LoadAsync(db, currentUser, cancellationToken);
        if (company is null) return Result<SiteDraftResultDto>.Failure(CompanySiteLoader.NotFoundMessage);
        string cdn = CompanySiteLoader.Cdn(storageOptions);
        if (company.IsSiteDraftStale(request.Version)) return await SiteEditor.ConflictAsync(db, company, cdn, seoOptions.Value, cancellationToken);

        IReadOnlySet<Guid> regionIds = await CompanySiteLoader.RegionIdsAsync(db, company.Id, cancellationToken);
        DateTime now = clock.GetUtcNow().UtcDateTime;
        // Saatler, WhatsApp ve nasıl gelinir şubenindir: gövdede gelse de taslağa yazılmaz.
        request.ClearBranchInfo();
        // Silinen ekip üyesinin fotoğrafı yayında da yoksa dosyası silinir.
        IReadOnlySet<string> before = company.SiteImageKeysInUse();
        try
        {
            SiteSnapshot next = company.GetSiteDraft().WithTexts(request.ToSiteTexts(regionIds, request.SeoTitle, request.SeoDescription), now.Year);
            company.SaveSiteDraft(next, now);
        }
        catch (DomainException ex)
        {
            return Result<SiteDraftResultDto>.Failure(ex.Message);
        }

        await db.SaveChangesAsync(cancellationToken);
        await CompanySiteLoader.DeleteUnusedImagesAsync(imageStorage, company, before, cancellationToken);
        return await SiteEditor.OkAsync(db, company, cdn, seoOptions.Value, cancellationToken);
    }
}

// ── Alan bazında geri al (yayındaki değerine döndür) ────────────────────────────────────────────
public class RevertSiteDraftFieldsCommand : IRequest<Result<SiteDraftResultDto>>
{
    public int Version { get; set; }
    /// <summary>SiteEditorDto.Changes[].Field değerleri.</summary>
    public List<string> Fields { get; set; } = [];
}

public class RevertSiteDraftFieldsCommandValidator : AbstractValidator<RevertSiteDraftFieldsCommand>
{
    public RevertSiteDraftFieldsCommandValidator()
    {
        RuleFor(x => x.Fields).NotEmpty().WithMessage("Geri alınacak alanı seçin.");
        RuleForEach(x => x.Fields).Must(SiteEditor.IsKnownField).WithMessage("Geçersiz alan.");
    }
}

public class RevertSiteDraftFieldsCommandHandler(
    IAppDbContext db, ICurrentUserService currentUser, IImageStorageService imageStorage,
    IOptions<BunnyStorageOptions> storageOptions, IOptions<SeoOptions> seoOptions, TimeProvider clock)
    : IRequestHandler<RevertSiteDraftFieldsCommand, Result<SiteDraftResultDto>>
{
    public async Task<Result<SiteDraftResultDto>> Handle(RevertSiteDraftFieldsCommand request, CancellationToken cancellationToken)
    {
        Company? company = await SiteEditor.LoadAsync(db, currentUser, cancellationToken);
        if (company is null) return Result<SiteDraftResultDto>.Failure(CompanySiteLoader.NotFoundMessage);
        string cdn = CompanySiteLoader.Cdn(storageOptions);
        if (company.IsSiteDraftStale(request.Version)) return await SiteEditor.ConflictAsync(db, company, cdn, seoOptions.Value, cancellationToken);

        IReadOnlySet<string> before = company.SiteImageKeysInUse();
        SiteSnapshot published = company.GetPublishedSite();
        try
        {
            SiteSnapshot next = request.Fields.Distinct().Aggregate(company.GetSiteDraft(), (draft, field) => draft.WithFieldFrom(published, field));
            company.SaveSiteDraft(next, clock.GetUtcNow().UtcDateTime);
        }
        catch (DomainException ex)
        {
            return Result<SiteDraftResultDto>.Failure(ex.Message);
        }

        await db.SaveChangesAsync(cancellationToken);
        // Geri alınan alanın taslağa yeni yüklenmiş fotoğrafı artık kullanılmıyor.
        await CompanySiteLoader.DeleteUnusedImagesAsync(imageStorage, company, before, cancellationToken);
        return await SiteEditor.OkAsync(db, company, cdn, seoOptions.Value, cancellationToken);
    }
}

// ── Yayınla ─────────────────────────────────────────────────────────────────────────────────────
public class PublishSiteDraftCommand : IRequest<Result<SiteDraftResultDto>>
{
    public int Version { get; set; }
}

public class PublishSiteDraftCommandHandler(
    IAppDbContext db, ICurrentUserService currentUser, IImageStorageService imageStorage,
    IOptions<BunnyStorageOptions> storageOptions, IOptions<SeoOptions> seoOptions, TimeProvider clock)
    : IRequestHandler<PublishSiteDraftCommand, Result<SiteDraftResultDto>>
{
    public async Task<Result<SiteDraftResultDto>> Handle(PublishSiteDraftCommand request, CancellationToken cancellationToken)
    {
        Company? company = await SiteEditor.LoadAsync(db, currentUser, cancellationToken);
        if (company is null) return Result<SiteDraftResultDto>.Failure(CompanySiteLoader.NotFoundMessage);
        string cdn = CompanySiteLoader.Cdn(storageOptions);
        if (company.IsSiteDraftStale(request.Version)) return await SiteEditor.ConflictAsync(db, company, cdn, seoOptions.Value, cancellationToken);

        SiteEditorDto current = await SiteEditor.BuildAsync(db, company, cdn, seoOptions.Value, cancellationToken);
        if (!current.HasChanges) return Result<SiteDraftResultDto>.Success(new SiteDraftResultDto { Editor = current });

        IReadOnlySet<string> before = company.SiteImageKeysInUse();
        company.PublishSiteDraft(clock.GetUtcNow().UtcDateTime);
        await SiteEditor.AddAuditLogAsync(db, currentUser, company, "SitePublished",
            $"restoran sitesindeki {current.Changes.Count} değişikliği yayınladı ({SiteEditor.Labels(current)}).", cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        // Yayından kalkan eski fotoğraflar (restoranın kendi dosyaları) silinir; hazır görseller (shared/) kalır.
        await CompanySiteLoader.DeleteUnusedImagesAsync(imageStorage, company, before, cancellationToken);
        return await SiteEditor.OkAsync(db, company, cdn, seoOptions.Value, cancellationToken);
    }
}

// ── Değişiklikleri at ───────────────────────────────────────────────────────────────────────────
public class DiscardSiteDraftCommand : IRequest<Result<SiteDraftResultDto>>
{
    public int Version { get; set; }
}

public class DiscardSiteDraftCommandHandler(
    IAppDbContext db, ICurrentUserService currentUser, IImageStorageService imageStorage,
    IOptions<BunnyStorageOptions> storageOptions, IOptions<SeoOptions> seoOptions)
    : IRequestHandler<DiscardSiteDraftCommand, Result<SiteDraftResultDto>>
{
    public async Task<Result<SiteDraftResultDto>> Handle(DiscardSiteDraftCommand request, CancellationToken cancellationToken)
    {
        Company? company = await SiteEditor.LoadAsync(db, currentUser, cancellationToken);
        if (company is null) return Result<SiteDraftResultDto>.Failure(CompanySiteLoader.NotFoundMessage);
        string cdn = CompanySiteLoader.Cdn(storageOptions);
        if (company.IsSiteDraftStale(request.Version)) return await SiteEditor.ConflictAsync(db, company, cdn, seoOptions.Value, cancellationToken);
        if (company.SiteDraft is null) return await SiteEditor.OkAsync(db, company, cdn, seoOptions.Value, cancellationToken);

        SiteEditorDto current = await SiteEditor.BuildAsync(db, company, cdn, seoOptions.Value, cancellationToken);
        IReadOnlySet<string> before = company.SiteImageKeysInUse();
        company.DiscardSiteDraft();
        await SiteEditor.AddAuditLogAsync(db, currentUser, company, "SiteDraftDiscarded",
            current.HasChanges
                ? $"restoran sitesinin taslağındaki {current.Changes.Count} değişikliği attı ({SiteEditor.Labels(current)})."
                : "restoran sitesinin taslağını attı.",
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        // Yalnız taslağa yüklenmiş fotoğraflar silinir.
        await CompanySiteLoader.DeleteUnusedImagesAsync(imageStorage, company, before, cancellationToken);
        return await SiteEditor.OkAsync(db, company, cdn, seoOptions.Value, cancellationToken);
    }
}

// ── Taslağın fotoğrafları: yükle / hazır görsel seç / kaldır ────────────────────────────────────
public enum SiteDraftImageTarget
{
    Cover = 1,
    About = 2,
    Founder = 3,
    Share = 4,
    Gallery = 5,
    Region = 6,
    MenuHero = 7,
    AboutHero = 8,
    VenueHero = 9,
    ContactHero = 10,
    ReservationHero = 11,
    Logo = 12,
    /// <summary>"Ekibimiz" üyesinin portresi (TeamMemberId). Hazır görsel seçilemez: ekip fotoğrafı gerçek kişinindir.</summary>
    TeamMember = 13,
}

/// <summary>
/// Taslaktaki bir fotoğraf alanını değiştirir. Kaynak: Content (yükleme) ya da StockImageId (hazır görsel); ikisi de
/// yoksa fotoğraf kaldırılır. Galeri: GalleryIndex verilirse o fotoğraf değişir/kaldırılır, yoksa sona eklenir.
/// Sürüm denetlenmez (tek alanlık işlem); sürüm yine artar ve yanıtta döner.
/// </summary>
public class SetSiteDraftImageCommand : IRequest<Result<SiteEditorDto>>
{
    public SiteDraftImageTarget Target { get; set; }
    public Guid? RegionId { get; set; }
    public Guid? TeamMemberId { get; set; }
    public int? GalleryIndex { get; set; }
    public Stream? Content { get; set; }
    public Guid? StockImageId { get; set; }
}

public class SetSiteDraftImageCommandHandler(
    IAppDbContext db, ICurrentUserService currentUser, IImageStorageService imageStorage,
    IOptions<BunnyStorageOptions> storageOptions, IOptions<SeoOptions> seoOptions, TimeProvider clock)
    : IRequestHandler<SetSiteDraftImageCommand, Result<SiteEditorDto>>
{
    // Eski uçlarla aynı boyutlar; paylaşım görseli og:image için 1200 px.
    private static int MaxSize(SiteDraftImageTarget target) => target switch
    {
        SiteDraftImageTarget.Cover => 2000,
        SiteDraftImageTarget.MenuHero or SiteDraftImageTarget.AboutHero or SiteDraftImageTarget.VenueHero
            or SiteDraftImageTarget.ContactHero or SiteDraftImageTarget.ReservationHero => 2000,
        SiteDraftImageTarget.Founder or SiteDraftImageTarget.TeamMember => 1000,
        SiteDraftImageTarget.Share => 1200,
        // Logo QR menünün başlığında ve ürün yer tutucusunda küçük çizilir; WebP saydamlığı korur.
        SiteDraftImageTarget.Logo => 512,
        SiteDraftImageTarget.Gallery => 1600,
        _ => 1400,
    };

    public async Task<Result<SiteEditorDto>> Handle(SetSiteDraftImageCommand request, CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(request.Target)) return Result<SiteEditorDto>.Failure("Geçersiz görsel alanı.");
        if (request.Content is not null && request.StockImageId is not null) return Result<SiteEditorDto>.Failure("Tek bir görsel seçin.");
        // Hazır görsel kütüphanesinde logo yok: logo restoranın kendi dosyasıdır.
        if (request.Target == SiteDraftImageTarget.Logo && request.StockImageId is not null)
            return Result<SiteEditorDto>.Failure("Logo için kendi görselinizi yükleyin.");
        // Ekip fotoğrafı gerçek bir kişinindir: hazır görsel kullanılmaz.
        if (request.Target == SiteDraftImageTarget.TeamMember && request.StockImageId is not null)
            return Result<SiteEditorDto>.Failure("Ekip fotoğrafı için kişinin kendi fotoğrafını yükleyin.");

        Company? company = await SiteEditor.LoadAsync(db, currentUser, cancellationToken);
        if (company is null) return Result<SiteEditorDto>.Failure(CompanySiteLoader.NotFoundMessage);

        bool removing = request.Content is null && request.StockImageId is null;
        SiteSnapshot draft = company.GetSiteDraft();

        if (request.Target == SiteDraftImageTarget.Region)
        {
            bool regionExists = request.RegionId is Guid regionId
                && await db.Regions.AnyAsync(r => r.Id == regionId && r.Branch.CompanyId == company.Id && !r.Branch.IsDeleted, cancellationToken);
            if (!regionExists) return Result<SiteEditorDto>.Failure("Bölüm bulunamadı.");
        }
        // Üye yüklemeden önce denetlenir: taslakta olmayan üyeye boşuna dosya yüklenmesin.
        if (request.Target == SiteDraftImageTarget.TeamMember
            && !(request.TeamMemberId is Guid memberId && draft.Content.TeamMembers.Any(m => m.Id == memberId)))
            return Result<SiteEditorDto>.Failure("Ekip üyesi bulunamadı. Önce üyenin adını yazın.");
        if (request.Target == SiteDraftImageTarget.Gallery)
        {
            if (removing && request.GalleryIndex is null) return Result<SiteEditorDto>.Failure("Fotoğraf bulunamadı.");
            if (request.GalleryIndex is int index && (index < 0 || index >= draft.Content.GalleryImages.Count))
                return Result<SiteEditorDto>.Failure("Fotoğraf bulunamadı.");
            // Sınır yüklemeden önce denetlenir: dolu galeriye boşuna dosya yüklenmesin.
            if (!removing && request.GalleryIndex is null && draft.Content.GalleryImages.Count >= SiteContent.GalleryMax)
                return Result<SiteEditorDto>.Failure($"En fazla {SiteContent.GalleryMax} mekân fotoğrafı eklenebilir. Yenisini eklemek için birini kaldırın.");
        }

        string key = string.Empty;
        string uploaded = string.Empty;
        if (request.StockImageId is Guid stockId)
        {
            StockImage? stock = await db.StockImages.AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == stockId && s.IsActive && !s.IsDeleted, cancellationToken);
            if (stock is null) return Result<SiteEditorDto>.Failure("Böyle bir hazır görsel bulunamadı.");
            key = stock.StorageKey;
        }
        else if (request.Content is not null)
        {
            (key, string? error) = await SiteImageUpload.UploadAsync(imageStorage, request.Content, company.Id, MaxSize(request.Target), cancellationToken);
            if (error is not null) return Result<SiteEditorDto>.Failure(error);
            uploaded = key;
        }

        // Yeni yüklenen dosya da listede: işlem başarısız olursa kullanılmadığı için silinir.
        List<string> before = [.. company.SiteImageKeysInUse(), uploaded];
        try
        {
            SiteSnapshot next = request.Target switch
            {
                SiteDraftImageTarget.Cover => draft.WithImage(SiteImageSlot.Cover, key),
                SiteDraftImageTarget.About => draft.WithImage(SiteImageSlot.About, key),
                SiteDraftImageTarget.Logo => draft.WithImage(SiteImageSlot.Logo, key),
                SiteDraftImageTarget.Founder => draft.WithImage(SiteImageSlot.Founder, key),
                SiteDraftImageTarget.Share => draft.WithImage(SiteImageSlot.Share, key),
                SiteDraftImageTarget.MenuHero => draft.WithImage(SiteImageSlot.MenuHero, key),
                SiteDraftImageTarget.AboutHero => draft.WithImage(SiteImageSlot.AboutHero, key),
                SiteDraftImageTarget.VenueHero => draft.WithImage(SiteImageSlot.VenueHero, key),
                SiteDraftImageTarget.ContactHero => draft.WithImage(SiteImageSlot.ContactHero, key),
                SiteDraftImageTarget.ReservationHero => draft.WithImage(SiteImageSlot.ReservationHero, key),
                SiteDraftImageTarget.Gallery when removing => draft.WithoutGalleryImage(request.GalleryIndex!.Value),
                SiteDraftImageTarget.Gallery => draft.WithGalleryImage(key, request.GalleryIndex),
                SiteDraftImageTarget.TeamMember => draft.WithTeamPhoto(request.TeamMemberId!.Value, key),
                _ => draft.WithRegionPhoto(request.RegionId!.Value, key),
            };
            company.SaveSiteDraft(next, clock.GetUtcNow().UtcDateTime);
        }
        catch (DomainException ex)
        {
            await imageStorage.DeleteReplacedImageAsync(uploaded, cancellationToken);
            return Result<SiteEditorDto>.Failure(ex.Message);
        }

        await db.SaveChangesAsync(cancellationToken);
        // Taslakta yerini yenisine bırakan ve yayında olmayan dosya (ör. iki kez yüklenen kapak) silinir.
        await CompanySiteLoader.DeleteUnusedImagesAsync(imageStorage, company, before, cancellationToken);

        return Result<SiteEditorDto>.Success(
            await SiteEditor.BuildAsync(db, company, CompanySiteLoader.Cdn(storageOptions), seoOptions.Value, cancellationToken));
    }
}

public class ReorderSiteDraftGalleryCommand : IRequest<Result<SiteEditorDto>>
{
    /// <summary>Taslak galerinin mevcut sıralarının yeni dizilişi; ör. [2, 0, 1].</summary>
    public List<int> Order { get; set; } = [];
}

public class ReorderSiteDraftGalleryCommandHandler(
    IAppDbContext db, ICurrentUserService currentUser, IOptions<BunnyStorageOptions> storageOptions, IOptions<SeoOptions> seoOptions,
    TimeProvider clock)
    : IRequestHandler<ReorderSiteDraftGalleryCommand, Result<SiteEditorDto>>
{
    public async Task<Result<SiteEditorDto>> Handle(ReorderSiteDraftGalleryCommand request, CancellationToken cancellationToken)
    {
        Company? company = await SiteEditor.LoadAsync(db, currentUser, cancellationToken);
        if (company is null) return Result<SiteEditorDto>.Failure(CompanySiteLoader.NotFoundMessage);

        try
        {
            company.SaveSiteDraft(company.GetSiteDraft().WithGalleryOrder(request.Order ?? []), clock.GetUtcNow().UtcDateTime);
        }
        catch (DomainException ex)
        {
            return Result<SiteEditorDto>.Failure(ex.Message);
        }

        await db.SaveChangesAsync(cancellationToken);
        return Result<SiteEditorDto>.Success(
            await SiteEditor.BuildAsync(db, company, CompanySiteLoader.Cdn(storageOptions), seoOptions.Value, cancellationToken));
    }
}
