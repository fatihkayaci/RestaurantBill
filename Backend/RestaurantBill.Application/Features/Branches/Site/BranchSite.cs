using System.Globalization;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Branches.Site;

// Admin "Restoran sitesi" sayfası: oturumdaki şubenin site içeriği.
// Bu dosyadaki uçlar ESKİ formun uçlarıdır ve YAYINDAKİ siteyi doğrudan değiştirir. Yeni görsel düzenleyici taslağa yazar
// (SiteDraft.cs, api/branch/site/draft...). Ön yüz düzenleyiciye geçince bu uçlar kaldırılabilir (docs/site-editor.md).

internal static class BranchSiteLoader
{
    public static Task<Branch?> LoadAsync(IAppDbContext db, ICurrentUserService currentUser, CancellationToken cancellationToken, bool tracking = true)
    {
        IQueryable<Branch> query = tracking ? db.Branches : db.Branches.AsNoTracking();
        return query.FirstOrDefaultAsync(b => b.Id == currentUser.BranchId && !b.IsDeleted, cancellationToken);
    }

    /// <summary>Admin şekli: site içeriği + şubenin bütün bölümleri (ad, masa sayısı, sitedeki fotoğraf ve açıklama).</summary>
    public static async Task<BranchSiteDto> ToAdminDtoAsync(IAppDbContext db, Branch branch, string cdnBaseUrl, CancellationToken cancellationToken)
        => ToAdminDto(branch.GetPublishedSite(), await RegionsAsync(db, branch.Id, cancellationToken), cdnBaseUrl);

    public sealed record RegionRow(Guid Id, string Name, int Tables);

    public static Task<List<RegionRow>> RegionsAsync(IAppDbContext db, Guid branchId, CancellationToken cancellationToken)
        => db.Regions.AsNoTracking()
            .Where(r => r.BranchId == branchId)
            .OrderBy(r => r.SortOrder).ThenBy(r => r.Name)
            .Select(r => new RegionRow(r.Id, r.Name, db.Tables.Count(t => t.RegionId == r.Id && t.Status != TableStatus.OutOfService)))
            .ToListAsync(cancellationToken);

    public static async Task<IReadOnlySet<Guid>> RegionIdsAsync(IAppDbContext db, Guid branchId, CancellationToken cancellationToken)
        => (await db.Regions.AsNoTracking().Where(r => r.BranchId == branchId).Select(r => r.Id).ToListAsync(cancellationToken)).ToHashSet();

    /// <summary>Verilen hâlin (yayındaki ya da taslak) admin şekli.</summary>
    public static BranchSiteDto ToAdminDto(SiteSnapshot site, IReadOnlyList<RegionRow> regions, string cdnBaseUrl)
    {
        BranchSiteDto dto = BranchSiteDto.From(site, cdnBaseUrl);
        IReadOnlyList<SiteRegionDetail> details = site.Content.RegionDetails;
        dto.RegionDetails = regions.Select(r =>
        {
            SiteRegionDetail? detail = details.FirstOrDefault(d => d.RegionId == r.Id);
            return new SiteRegionDetailDto
            {
                RegionId = r.Id,
                Name = r.Name,
                TableCount = r.Tables,
                PhotoUrl = BranchSiteDto.ImageUrl(cdnBaseUrl, detail?.PhotoKey),
                Description = detail?.Description ?? string.Empty,
            };
        }).ToList();
        return dto;
    }

    /// <summary>
    /// Değişiklikten sonra artık ne yayında ne taslakta kullanılan fotoğrafları siler (en iyi çaba, kayıttan sonra).
    /// <paramref name="before"/>: değişiklikten önceki <see cref="Branch.SiteImageKeysInUse"/> (ve varsa yeni yüklenen anahtar).
    /// Paylaşılan (shared/) anahtar hiç silinmez.
    /// </summary>
    public static async Task DeleteUnusedImagesAsync(IImageStorageService imageStorage, Branch branch, IEnumerable<string> before,
        CancellationToken cancellationToken)
    {
        IReadOnlySet<string> inUse = branch.SiteImageKeysInUse();
        foreach (string key in before.Where(k => !inUse.Contains(k)).Distinct())
            await imageStorage.DeleteReplacedImageAsync(key, cancellationToken);
    }

    public static string Cdn(IOptions<BunnyStorageOptions> options) => options.Value.CdnBaseUrl.TrimEnd('/');
}

// ── Oku ─────────────────────────────────────────────────────────────────────────────────────────
public class GetBranchSiteQuery : IRequest<Result<BranchSiteDto>>
{
}

public class GetBranchSiteQueryHandler(IAppDbContext db, ICurrentUserService currentUser, IOptions<BunnyStorageOptions> storageOptions)
    : IRequestHandler<GetBranchSiteQuery, Result<BranchSiteDto>>
{
    public async Task<Result<BranchSiteDto>> Handle(GetBranchSiteQuery request, CancellationToken cancellationToken)
    {
        Branch? branch = await BranchSiteLoader.LoadAsync(db, currentUser, cancellationToken, tracking: false);
        if (branch is null) return Result<BranchSiteDto>.Failure("Şube bulunamadı.");

        return Result<BranchSiteDto>.Success(await BranchSiteLoader.ToAdminDtoAsync(db, branch, BranchSiteLoader.Cdn(storageOptions), cancellationToken));
    }
}

// ── Metinleri ve saatleri kaydet ────────────────────────────────────────────────────────────────
/// <summary>Sitenin metin kısmı: eski form (<see cref="UpdateBranchSiteCommand"/>) ve taslak (<see cref="SaveSiteDraftCommand"/>) ortak kullanır.</summary>
public abstract class SiteTextsInput
{
    public string Headline { get; set; } = string.Empty;
    public string Tagline { get; set; } = string.Empty;
    public string StoryTitle { get; set; } = string.Empty;
    public string About { get; set; } = string.Empty;
    /// <summary>"HH:mm" ya da boş. Haftalık saat girildiyse yok sayılır (en sık aralık yazılır).</summary>
    public string? OpensAt { get; set; }
    public string? ClosesAt { get; set; }
    public string HoursNote { get; set; } = string.Empty;
    public string InstagramUrl { get; set; } = string.Empty;
    public string AccentColor { get; set; } = string.Empty;

    // Ek içerik (fotoğraflar ayrı uçlardan değişir).
    public string Theme { get; set; } = string.Empty;
    /// <summary>Sitenin tasarımı ("renkli", "sade", "elit", "sicak"; boş = renkli). null (eski form göndermez): değiştirme.</summary>
    public string? Design { get; set; }
    /// <summary>Yazı tipi çifti (SiteContent.FontKeys; boş = tasarımın kendi yazı tipi). null: değiştirme.</summary>
    public string? Font { get; set; }
    /// <summary>Boş: "her gün aynı". Doluysa 7 gün.</summary>
    public List<SiteDayHoursDto> WeeklyHours { get; set; } = [];
    public string DirectionsNote { get; set; } = string.Empty;
    public string WhatsappPhone { get; set; } = string.Empty;
    public List<string> Amenities { get; set; } = [];
    /// <summary>Gizlenen hazır soru anahtarları; null (eski form göndermez): değiştirme.</summary>
    public List<string>? HiddenFaqs { get; set; }
    public decimal? Rating { get; set; }
    public int? ReviewCount { get; set; }
    public string ReviewsUrl { get; set; } = string.Empty;
    public List<SiteReviewDto> FeaturedReviews { get; set; } = [];
    public string FounderName { get; set; } = string.Empty;
    public string FounderTitle { get; set; } = string.Empty;
    public string FounderQuote { get; set; } = string.Empty;
    public int? FoundedYear { get; set; }
    public List<SiteValueDto> Values { get; set; } = [];
    public List<SiteMilestoneDto> Milestones { get; set; } = [];
    /// <summary>Bölüm açıklamaları (yalnız RegionId ve Description okunur).</summary>
    public List<SiteRegionDetailDto> RegionDetails { get; set; } = [];

    /// <summary>Domain'in metin girdisi. Başka şubenin bölüm kimliği sessizce yok sayılır. SEO null: değiştirme.</summary>
    internal SiteTexts ToSiteTexts(IReadOnlySet<Guid> regionIds, string? seoTitle = null, string? seoDescription = null) => new()
    {
        Headline = Headline ?? string.Empty,
        Tagline = Tagline ?? string.Empty,
        StoryTitle = StoryTitle ?? string.Empty,
        About = About ?? string.Empty,
        OpensAt = ParseTime(OpensAt),
        ClosesAt = ParseTime(ClosesAt),
        HoursNote = HoursNote ?? string.Empty,
        InstagramUrl = InstagramUrl ?? string.Empty,
        AccentColor = AccentColor ?? string.Empty,
        Content = new SiteContentTexts
        {
            Theme = Theme ?? string.Empty,
            Design = Design,
            Font = Font,
            WeeklyHours = (WeeklyHours ?? []).Select(d => new SiteDayHours(
                (DayOfWeek)d.Day, d.IsOpen, TimeOnly.ParseExact(d.Opens, "HH:mm", CultureInfo.InvariantCulture),
                TimeOnly.ParseExact(d.Closes, "HH:mm", CultureInfo.InvariantCulture))).ToList(),
            DirectionsNote = DirectionsNote ?? string.Empty,
            WhatsappPhone = WhatsappPhone ?? string.Empty,
            Amenities = Amenities ?? [],
            HiddenFaqs = HiddenFaqs,
            Rating = Rating,
            ReviewCount = ReviewCount,
            ReviewsUrl = ReviewsUrl ?? string.Empty,
            FeaturedReviews = (FeaturedReviews ?? []).Select(r => new SiteReview(r.Author, r.Text, r.Source)).ToList(),
            FounderName = FounderName ?? string.Empty,
            FounderTitle = FounderTitle ?? string.Empty,
            FounderQuote = FounderQuote ?? string.Empty,
            FoundedYear = FoundedYear,
            Values = (Values ?? []).Select(v => new SiteValue(v.Title, v.Text)).ToList(),
            Milestones = (Milestones ?? []).Select(m => new SiteMilestone(m.Year, m.Text)).ToList(),
            RegionDescriptions = (RegionDetails ?? [])
                .Where(r => regionIds.Contains(r.RegionId))
                .GroupBy(r => r.RegionId)
                .ToDictionary(g => g.Key, g => g.Last().Description ?? string.Empty),
            SeoTitle = seoTitle,
            SeoDescription = seoDescription,
        },
    };

    private static TimeOnly? ParseTime(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : TimeOnly.ParseExact(value, "HH:mm", CultureInfo.InvariantCulture);
}

/// <summary>Eski "Restoran sitesi" formu: yayındaki siteyi doğrudan değiştirir. Yeni düzenleyici taslağa yazar (SaveSiteDraftCommand).</summary>
public class UpdateBranchSiteCommand : SiteTextsInput, IRequest<Result<BranchSiteDto>>
{
}

/// <summary>Site metinlerinin ortak kuralları (eski form ve taslak).</summary>
public abstract class SiteTextsValidator<T> : AbstractValidator<T> where T : SiteTextsInput
{
    protected SiteTextsValidator()
    {
        RuleFor(x => x.Headline).MaximumLength(Branch.SiteHeadlineMaxLength)
            .WithMessage($"Başlık en fazla {Branch.SiteHeadlineMaxLength} karakter olabilir.");
        RuleFor(x => x.Tagline).MaximumLength(Branch.SiteTaglineMaxLength)
            .WithMessage($"Alt başlık en fazla {Branch.SiteTaglineMaxLength} karakter olabilir.");
        RuleFor(x => x.StoryTitle).MaximumLength(Branch.SiteStoryTitleMaxLength)
            .WithMessage($"Hikâye başlığı en fazla {Branch.SiteStoryTitleMaxLength} karakter olabilir.");
        RuleFor(x => x.About).MaximumLength(Branch.SiteAboutMaxLength)
            .WithMessage($"Hikâye en fazla {Branch.SiteAboutMaxLength} karakter olabilir.");
        RuleFor(x => x.HoursNote).MaximumLength(Branch.HoursNoteMaxLength)
            .WithMessage($"Saat notu en fazla {Branch.HoursNoteMaxLength} karakter olabilir.");
        RuleFor(x => x.InstagramUrl).MaximumLength(Branch.InstagramUrlMaxLength)
            .WithMessage($"Instagram adresi en fazla {Branch.InstagramUrlMaxLength} karakter olabilir.");
        RuleFor(x => x.OpensAt).Must(BeTimeOrEmpty).WithMessage("Açılış saati SS:dd biçiminde olmalıdır.");
        RuleFor(x => x.ClosesAt).Must(BeTimeOrEmpty).WithMessage("Kapanış saati SS:dd biçiminde olmalıdır.");

        RuleFor(x => x.Theme).Must(t => string.IsNullOrWhiteSpace(t) || SiteContent.ThemeKeys.Contains(t.Trim().ToLowerInvariant()))
            .WithMessage("Geçersiz site teması.");
        RuleFor(x => x.Design).Must(d => string.IsNullOrWhiteSpace(d) || SiteContent.DesignKeys.Contains(d.Trim().ToLowerInvariant()))
            .When(x => x.Design is not null).WithMessage("Geçersiz site tasarımı.");
        RuleFor(x => x.Font).Must(f => string.IsNullOrWhiteSpace(f) || SiteContent.FontKeys.Contains(f.Trim().ToLowerInvariant()))
            .When(x => x.Font is not null).WithMessage("Geçersiz yazı tipi.");
        RuleFor(x => x.WeeklyHours).Must(w => w.Count == 0 || (w.Count == 7 && w.Select(d => d.Day).Distinct().Count() == 7))
            .WithMessage("Haftalık saatlerde her gün bir kez yer almalıdır.");
        RuleForEach(x => x.WeeklyHours).ChildRules(day =>
        {
            day.RuleFor(d => d.Day).InclusiveBetween(0, 6).WithMessage("Geçersiz gün.");
            day.RuleFor(d => d.Opens).Must(BeTime).WithMessage("Açılış saati SS:dd biçiminde olmalıdır.");
            day.RuleFor(d => d.Closes).Must(BeTime).WithMessage("Kapanış saati SS:dd biçiminde olmalıdır.");
        });
        RuleFor(x => x.DirectionsNote).MaximumLength(SiteContent.DirectionsNoteMaxLength)
            .WithMessage($"Nasıl gelinir notu en fazla {SiteContent.DirectionsNoteMaxLength} karakter olabilir.");
        RuleFor(x => x.WhatsappPhone).MaximumLength(SiteContent.WhatsappMaxLength)
            .WithMessage("WhatsApp numarası çok uzun.");
        RuleForEach(x => x.Amenities).Must(a => SiteContent.AmenityKeys.Contains(a.Trim().ToLowerInvariant()))
            .WithMessage("Olanaklar yalnız hazır listeden seçilebilir.");
        RuleFor(x => x.HiddenFaqs!.Count).LessThanOrEqualTo(SiteContent.HiddenFaqsMax)
            .When(x => x.HiddenFaqs is not null).WithMessage($"En fazla {SiteContent.HiddenFaqsMax} soru gizlenebilir.");
        RuleForEach(x => x.HiddenFaqs).Must(k => k is not null && SiteContent.FaqKeyPattern.IsMatch(k.Trim().ToLowerInvariant()))
            .When(x => x.HiddenFaqs is not null).WithMessage("Geçersiz soru anahtarı.");
        RuleFor(x => x.Rating).InclusiveBetween(SiteContent.RatingMin, SiteContent.RatingMax)
            .When(x => x.Rating.HasValue).WithMessage("Puan 1 ile 5 arasında olmalıdır.");
        RuleFor(x => x.ReviewCount).InclusiveBetween(0, SiteContent.ReviewCountMax)
            .When(x => x.ReviewCount.HasValue).WithMessage("Yorum sayısı geçersiz.");
        RuleFor(x => x.ReviewsUrl).MaximumLength(SiteContent.ReviewsUrlMaxLength)
            .WithMessage($"Yorum bağlantısı en fazla {SiteContent.ReviewsUrlMaxLength} karakter olabilir.");
        RuleFor(x => x.FeaturedReviews.Count).LessThanOrEqualTo(SiteContent.ReviewsMax)
            .WithMessage($"En fazla {SiteContent.ReviewsMax} yorum seçilebilir.");
        RuleForEach(x => x.FeaturedReviews).ChildRules(review =>
        {
            review.RuleFor(r => r.Author).MaximumLength(SiteContent.ReviewAuthorMaxLength)
                .WithMessage($"Yorum sahibinin adı en fazla {SiteContent.ReviewAuthorMaxLength} karakter olabilir.");
            review.RuleFor(r => r.Text).MaximumLength(SiteContent.ReviewTextMaxLength)
                .WithMessage($"Yorum metni en fazla {SiteContent.ReviewTextMaxLength} karakter olabilir.");
            review.RuleFor(r => r.Source).MaximumLength(SiteContent.ReviewSourceMaxLength)
                .WithMessage($"Yorum kaynağı en fazla {SiteContent.ReviewSourceMaxLength} karakter olabilir.");
        });
        RuleFor(x => x.FounderName).MaximumLength(SiteContent.FounderNameMaxLength)
            .WithMessage($"Ustanın adı en fazla {SiteContent.FounderNameMaxLength} karakter olabilir.");
        RuleFor(x => x.FounderTitle).MaximumLength(SiteContent.FounderTitleMaxLength)
            .WithMessage($"Ustanın unvanı en fazla {SiteContent.FounderTitleMaxLength} karakter olabilir.");
        RuleFor(x => x.FounderQuote).MaximumLength(SiteContent.FounderQuoteMaxLength)
            .WithMessage($"Ustanın sözü en fazla {SiteContent.FounderQuoteMaxLength} karakter olabilir.");
        RuleFor(x => x.FoundedYear).InclusiveBetween(SiteContent.MinYear, DateTime.UtcNow.Year)
            .When(x => x.FoundedYear.HasValue).WithMessage("Kuruluş yılı geçersiz.");
        RuleFor(x => x.Values.Count).LessThanOrEqualTo(SiteContent.ValuesMax)
            .WithMessage($"En fazla {SiteContent.ValuesMax} değer girilebilir.");
        RuleForEach(x => x.Values).ChildRules(value =>
        {
            value.RuleFor(v => v.Title).MaximumLength(SiteContent.ValueTitleMaxLength)
                .WithMessage($"Değer başlığı en fazla {SiteContent.ValueTitleMaxLength} karakter olabilir.");
            value.RuleFor(v => v.Text).MaximumLength(SiteContent.ValueTextMaxLength)
                .WithMessage($"Değer cümlesi en fazla {SiteContent.ValueTextMaxLength} karakter olabilir.");
        });
        RuleFor(x => x.Milestones.Count).LessThanOrEqualTo(SiteContent.MilestonesMax)
            .WithMessage($"En fazla {SiteContent.MilestonesMax} kilometre taşı girilebilir.");
        RuleForEach(x => x.Milestones).ChildRules(m =>
        {
            m.RuleFor(v => v.Text).MaximumLength(SiteContent.MilestoneTextMaxLength)
                .WithMessage($"Kilometre taşı en fazla {SiteContent.MilestoneTextMaxLength} karakter olabilir.");
        });
        RuleForEach(x => x.RegionDetails).ChildRules(r =>
        {
            r.RuleFor(v => v.Description).MaximumLength(SiteContent.RegionDescriptionMaxLength)
                .WithMessage($"Bölüm açıklaması en fazla {SiteContent.RegionDescriptionMaxLength} karakter olabilir.");
        });
    }

    private static bool BeTimeOrEmpty(string? value) => string.IsNullOrWhiteSpace(value) || BeTime(value);

    private static bool BeTime(string? value) =>
        TimeOnly.TryParseExact(value, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
}

public class UpdateBranchSiteCommandValidator : SiteTextsValidator<UpdateBranchSiteCommand>
{
}

public class UpdateBranchSiteCommandHandler(IAppDbContext db, ICurrentUserService currentUser, IOptions<BunnyStorageOptions> storageOptions)
    : IRequestHandler<UpdateBranchSiteCommand, Result<BranchSiteDto>>
{
    public async Task<Result<BranchSiteDto>> Handle(UpdateBranchSiteCommand request, CancellationToken cancellationToken)
    {
        Branch? branch = await BranchSiteLoader.LoadAsync(db, currentUser, cancellationToken);
        if (branch is null) return Result<BranchSiteDto>.Failure("Şube bulunamadı.");

        // Açıklaması yazılan bölüm bu şubenin olmalı; başka şubenin kimliği sessizce yok sayılır.
        IReadOnlySet<Guid> regionIds = await BranchSiteLoader.RegionIdsAsync(db, branch.Id, cancellationToken);

        try
        {
            SiteTexts texts = request.ToSiteTexts(regionIds);
            branch.UpdateSite(texts.Headline, texts.Tagline, texts.StoryTitle, texts.About, texts.OpensAt, texts.ClosesAt,
                texts.HoursNote, texts.InstagramUrl, texts.AccentColor);
            branch.UpdateSiteContent(texts.Content, DateTime.UtcNow.Year);
        }
        catch (DomainException ex)
        {
            return Result<BranchSiteDto>.Failure(ex.Message);
        }

        await db.SaveChangesAsync(cancellationToken);
        return Result<BranchSiteDto>.Success(await BranchSiteLoader.ToAdminDtoAsync(db, branch, BranchSiteLoader.Cdn(storageOptions), cancellationToken));
    }
}

// ── Fotoğraf yükleme ortak adımı ────────────────────────────────────────────────────────────────
internal static class SiteImageUpload
{
    /// <summary>Görseli yükler; hata olursa kullanıcıya gösterilecek mesajı döner.</summary>
    public static async Task<(string Key, string? Error)> UploadAsync(IImageStorageService imageStorage, Stream content, Guid branchId, int maxSize,
        CancellationToken cancellationToken)
    {
        try
        {
            return (await imageStorage.UploadAsync(content, branchId, "site", maxSize, cancellationToken), null);
        }
        catch (ImageUploadException ex)
        {
            // Bu uçlarda Content-Type kontrolü yok; biçim, depolama servisinde dosyanın kendisinden doğrulanır.
            return (string.Empty, ex.Message);
        }
        catch
        {
            return (string.Empty, "Görsel dosyası işlenemedi. Lütfen geçerli bir resim yükleyin.");
        }
    }
}

// ── Fotoğraf yükle / kaldır (kapak, hikâye, usta) ───────────────────────────────────────────────
public class SetBranchSiteImageCommand : IRequest<Result<BranchSiteDto>>
{
    public SiteImageSlot Slot { get; set; }
    /// <summary>null: fotoğrafı kaldır.</summary>
    public Stream? Content { get; set; }
}

public class SetBranchSiteImageCommandHandler(
    IAppDbContext db,
    ICurrentUserService currentUser,
    IImageStorageService imageStorage,
    IOptions<BunnyStorageOptions> storageOptions)
    : IRequestHandler<SetBranchSiteImageCommand, Result<BranchSiteDto>>
{
    // Kapak tam ekran gösterildiği için büyük, hikâye fotoğrafı yarım genişlikte, usta portresi küçük.
    private const int CoverMaxSize = 2000;
    private const int AboutMaxSize = 1400;
    private const int FounderMaxSize = 1000;

    public async Task<Result<BranchSiteDto>> Handle(SetBranchSiteImageCommand request, CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(request.Slot)) return Result<BranchSiteDto>.Failure("Geçersiz görsel alanı.");

        Branch? branch = await BranchSiteLoader.LoadAsync(db, currentUser, cancellationToken);
        if (branch is null) return Result<BranchSiteDto>.Failure("Şube bulunamadı.");

        string newKey = string.Empty;
        if (request.Content is not null)
        {
            int maxSize = request.Slot switch
            {
                SiteImageSlot.Cover => CoverMaxSize,
                SiteImageSlot.Founder => FounderMaxSize,
                _ => AboutMaxSize,
            };
            (newKey, string? error) = await SiteImageUpload.UploadAsync(imageStorage, request.Content, branch.Id, maxSize, cancellationToken);
            if (error is not null) return Result<BranchSiteDto>.Failure(error);
        }

        string previousKey = branch.ReplaceSiteImage(request.Slot, newKey);
        await db.SaveChangesAsync(cancellationToken);

        // Eski dosya en iyi çabayla silinir; paylaşılan anahtar ve taslağın hâlâ kullandığı dosya silinmez.
        await BranchSiteLoader.DeleteUnusedImagesAsync(imageStorage, branch, [previousKey], cancellationToken);

        return Result<BranchSiteDto>.Success(await BranchSiteLoader.ToAdminDtoAsync(db, branch, BranchSiteLoader.Cdn(storageOptions), cancellationToken));
    }
}

// ── Mekân fotoğrafları (galeri): ekle, kaldır, sırala ────────────────────────────────────────────
public class AddSiteGalleryImageCommand : IRequest<Result<BranchSiteDto>>
{
    public Stream Content { get; set; } = Stream.Null;
}

public class AddSiteGalleryImageCommandHandler(
    IAppDbContext db,
    ICurrentUserService currentUser,
    IImageStorageService imageStorage,
    IOptions<BunnyStorageOptions> storageOptions)
    : IRequestHandler<AddSiteGalleryImageCommand, Result<BranchSiteDto>>
{
    private const int GalleryMaxSize = 1600;

    public async Task<Result<BranchSiteDto>> Handle(AddSiteGalleryImageCommand request, CancellationToken cancellationToken)
    {
        Branch? branch = await BranchSiteLoader.LoadAsync(db, currentUser, cancellationToken);
        if (branch is null) return Result<BranchSiteDto>.Failure("Şube bulunamadı.");

        // Sınır yüklemeden önce denetlenir: dolu galeriye boşuna dosya yüklenmesin.
        if (branch.GetSiteContent().GalleryImages.Count >= SiteContent.GalleryMax)
            return Result<BranchSiteDto>.Failure($"En fazla {SiteContent.GalleryMax} mekân fotoğrafı yüklenebilir. Yenisini eklemek için birini kaldırın.");

        (string key, string? error) = await SiteImageUpload.UploadAsync(imageStorage, request.Content, branch.Id, GalleryMaxSize, cancellationToken);
        if (error is not null) return Result<BranchSiteDto>.Failure(error);

        try
        {
            branch.AddSiteGalleryImage(key);
        }
        catch (DomainException ex)
        {
            await imageStorage.DeleteReplacedImageAsync(key, cancellationToken);
            return Result<BranchSiteDto>.Failure(ex.Message);
        }

        await db.SaveChangesAsync(cancellationToken);
        return Result<BranchSiteDto>.Success(await BranchSiteLoader.ToAdminDtoAsync(db, branch, BranchSiteLoader.Cdn(storageOptions), cancellationToken));
    }
}

public class RemoveSiteGalleryImageCommand : IRequest<Result<BranchSiteDto>>
{
    /// <summary>Galerideki sıra (0'dan).</summary>
    public int Index { get; set; }
}

public class RemoveSiteGalleryImageCommandHandler(
    IAppDbContext db,
    ICurrentUserService currentUser,
    IImageStorageService imageStorage,
    IOptions<BunnyStorageOptions> storageOptions)
    : IRequestHandler<RemoveSiteGalleryImageCommand, Result<BranchSiteDto>>
{
    public async Task<Result<BranchSiteDto>> Handle(RemoveSiteGalleryImageCommand request, CancellationToken cancellationToken)
    {
        Branch? branch = await BranchSiteLoader.LoadAsync(db, currentUser, cancellationToken);
        if (branch is null) return Result<BranchSiteDto>.Failure("Şube bulunamadı.");

        string removed;
        try
        {
            removed = branch.RemoveSiteGalleryImage(request.Index);
        }
        catch (DomainException ex)
        {
            return Result<BranchSiteDto>.Failure(ex.Message);
        }

        await db.SaveChangesAsync(cancellationToken);
        await BranchSiteLoader.DeleteUnusedImagesAsync(imageStorage, branch, [removed], cancellationToken);
        return Result<BranchSiteDto>.Success(await BranchSiteLoader.ToAdminDtoAsync(db, branch, BranchSiteLoader.Cdn(storageOptions), cancellationToken));
    }
}

public class ReorderSiteGalleryCommand : IRequest<Result<BranchSiteDto>>
{
    /// <summary>Mevcut sıraların yeni dizilişi; ör. [2, 0, 1] üçüncü fotoğrafı başa alır.</summary>
    public List<int> Order { get; set; } = [];
}

public class ReorderSiteGalleryCommandHandler(IAppDbContext db, ICurrentUserService currentUser, IOptions<BunnyStorageOptions> storageOptions)
    : IRequestHandler<ReorderSiteGalleryCommand, Result<BranchSiteDto>>
{
    public async Task<Result<BranchSiteDto>> Handle(ReorderSiteGalleryCommand request, CancellationToken cancellationToken)
    {
        Branch? branch = await BranchSiteLoader.LoadAsync(db, currentUser, cancellationToken);
        if (branch is null) return Result<BranchSiteDto>.Failure("Şube bulunamadı.");

        try
        {
            branch.ReorderSiteGallery(request.Order ?? []);
        }
        catch (DomainException ex)
        {
            return Result<BranchSiteDto>.Failure(ex.Message);
        }

        await db.SaveChangesAsync(cancellationToken);
        return Result<BranchSiteDto>.Success(await BranchSiteLoader.ToAdminDtoAsync(db, branch, BranchSiteLoader.Cdn(storageOptions), cancellationToken));
    }
}

// ── Oturma bölümünün sitedeki fotoğrafı ─────────────────────────────────────────────────────────
public class SetSiteRegionImageCommand : IRequest<Result<BranchSiteDto>>
{
    public Guid RegionId { get; set; }
    /// <summary>null: fotoğrafı kaldır.</summary>
    public Stream? Content { get; set; }
}

public class SetSiteRegionImageCommandHandler(
    IAppDbContext db,
    ICurrentUserService currentUser,
    IImageStorageService imageStorage,
    IOptions<BunnyStorageOptions> storageOptions)
    : IRequestHandler<SetSiteRegionImageCommand, Result<BranchSiteDto>>
{
    private const int RegionMaxSize = 1400;

    public async Task<Result<BranchSiteDto>> Handle(SetSiteRegionImageCommand request, CancellationToken cancellationToken)
    {
        Branch? branch = await BranchSiteLoader.LoadAsync(db, currentUser, cancellationToken);
        if (branch is null) return Result<BranchSiteDto>.Failure("Şube bulunamadı.");

        bool regionExists = await db.Regions.AnyAsync(r => r.Id == request.RegionId && r.BranchId == branch.Id, cancellationToken);
        if (!regionExists) return Result<BranchSiteDto>.Failure("Bölüm bulunamadı.");

        string newKey = string.Empty;
        if (request.Content is not null)
        {
            (newKey, string? error) = await SiteImageUpload.UploadAsync(imageStorage, request.Content, branch.Id, RegionMaxSize, cancellationToken);
            if (error is not null) return Result<BranchSiteDto>.Failure(error);
        }

        string previousKey = branch.ReplaceSiteRegionPhoto(request.RegionId, newKey);
        await db.SaveChangesAsync(cancellationToken);
        await BranchSiteLoader.DeleteUnusedImagesAsync(imageStorage, branch, [previousKey], cancellationToken);

        return Result<BranchSiteDto>.Success(await BranchSiteLoader.ToAdminDtoAsync(db, branch, BranchSiteLoader.Cdn(storageOptions), cancellationToken));
    }
}
