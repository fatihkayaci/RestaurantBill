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

// Restoran sitesi şirket genelidir (Company.Site / SiteDraft); yalnız sahip, "Tümü" modunda düzenler (SiteDraft.cs).
// Şubeye ait site bilgileri (saatler, WhatsApp, nasıl gelinir) şubenin Ayarlar'ından değişir (BranchSiteInfo.cs).
// Bu dosya: ortak yükleyici, sitenin metin girdisi ve doğrulaması, fotoğraf yükleme adımı.

internal static class CompanySiteLoader
{
    public const string NotFoundMessage = "Restoran bulunamadı.";

    /// <summary>Oturumdaki sahibin şirketi; sahip değilse null (site yalnız sahip tarafından düzenlenir).</summary>
    public static Task<Company?> LoadAsync(IAppDbContext db, ICurrentUserService currentUser, CancellationToken cancellationToken, bool tracking = true)
    {
        if (currentUser.Role != "Owner") return Task.FromResult<Company?>(null);
        IQueryable<Company> query = tracking ? db.Companies : db.Companies.AsNoTracking();
        return query.FirstOrDefaultAsync(
            c => c.Id == currentUser.CompanyId && c.OwnerUserId == currentUser.UserId && !c.IsDeleted, cancellationToken);
    }

    /// <summary>Müşteri sitesinin varsayılan şubesi (en eski şube): önizlemedeki saatler, ilçe ve SEO'nun otomatik metni.</summary>
    public static Task<Branch?> PrimaryBranchAsync(IAppDbContext db, Guid companyId, CancellationToken cancellationToken)
        => db.Branches.AsNoTracking()
            .Where(b => b.CompanyId == companyId && !b.IsDeleted)
            .OrderBy(b => b.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

    /// <summary>Şubenin bilgileriyle birleştirilmiş site (şube yoksa olduğu gibi).</summary>
    public static SiteSnapshot WithBranch(SiteSnapshot site, Branch? branch) => branch is null ? site : branch.SiteFor(site);

    public sealed record RegionRow(Guid Id, string Name, int Tables);

    /// <summary>Şirketin bütün şubelerinin bölümleri; birden fazla şube varsa adın önünde şube adı ("Kadıköy · Bahçe").</summary>
    public static async Task<List<RegionRow>> RegionsAsync(IAppDbContext db, Guid companyId, CancellationToken cancellationToken)
    {
        var rows = await db.Regions.AsNoTracking()
            .Where(r => r.Branch.CompanyId == companyId && !r.Branch.IsDeleted)
            .OrderBy(r => r.Branch.CreatedAt).ThenBy(r => r.SortOrder).ThenBy(r => r.Name)
            .Select(r => new
            {
                r.Id, r.Name, r.BranchId, r.Branch.BranchName,
                Tables = db.Tables.Count(t => t.RegionId == r.Id && t.Status != TableStatus.OutOfService),
            })
            .ToListAsync(cancellationToken);
        bool manyBranches = rows.Select(r => r.BranchId).Distinct().Count() > 1;
        return rows.Select(r => new RegionRow(r.Id, manyBranches ? $"{r.BranchName} · {r.Name}" : r.Name, r.Tables)).ToList();
    }

    public static async Task<IReadOnlySet<Guid>> RegionIdsAsync(IAppDbContext db, Guid companyId, CancellationToken cancellationToken)
        => (await db.Regions.AsNoTracking()
            .Where(r => r.Branch.CompanyId == companyId && !r.Branch.IsDeleted)
            .Select(r => r.Id)
            .ToListAsync(cancellationToken)).ToHashSet();

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
    /// <paramref name="before"/>: değişiklikten önceki <see cref="Company.SiteImageKeysInUse"/> (ve varsa yeni yüklenen anahtar).
    /// Paylaşılan (shared/) anahtar hiç silinmez.
    /// </summary>
    public static async Task DeleteUnusedImagesAsync(IImageStorageService imageStorage, Company company, IEnumerable<string> before,
        CancellationToken cancellationToken)
    {
        IReadOnlySet<string> inUse = company.SiteImageKeysInUse();
        foreach (string key in before.Where(k => !inUse.Contains(k)).Distinct())
            await imageStorage.DeleteReplacedImageAsync(key, cancellationToken);
    }

    public static string Cdn(IOptions<BunnyStorageOptions> options) => options.Value.CdnBaseUrl.TrimEnd('/');
}

// ── Sitenin metinleri ────────────────────────────────────────────────────────────────────────────
/// <summary>
/// Sitenin metin kısmı (<see cref="SaveSiteDraftCommand"/>). Şubeye ait alanlar (saatler, saat notu, WhatsApp, nasıl gelinir)
/// gövdede gelebilir ama şirketin sitesine yazılmaz (<see cref="ClearBranchInfo"/>); onlar şubenin Ayarlar'ından değişir.
/// </summary>
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

    /// <summary>Şubeye ait alanları boşaltır: şirketin sitesine yazılmazlar, doğrulamaya da takılmasınlar.</summary>
    public void ClearBranchInfo()
    {
        OpensAt = null;
        ClosesAt = null;
        HoursNote = string.Empty;
        WeeklyHours = [];
        DirectionsNote = string.Empty;
        WhatsappPhone = string.Empty;
    }

    /// <summary>Domain'in metin girdisi. Başka şirketin bölüm kimliği sessizce yok sayılır. SEO null: değiştirme.</summary>
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

/// <summary>Site metinlerinin kuralları.</summary>
public abstract class SiteTextsValidator<T> : AbstractValidator<T> where T : SiteTextsInput
{
    protected SiteTextsValidator()
    {
        RuleFor(x => x.Headline).MaximumLength(SiteSnapshot.HeadlineMaxLength)
            .WithMessage($"Başlık en fazla {SiteSnapshot.HeadlineMaxLength} karakter olabilir.");
        RuleFor(x => x.Tagline).MaximumLength(SiteSnapshot.TaglineMaxLength)
            .WithMessage($"Alt başlık en fazla {SiteSnapshot.TaglineMaxLength} karakter olabilir.");
        RuleFor(x => x.StoryTitle).MaximumLength(SiteSnapshot.StoryTitleMaxLength)
            .WithMessage($"Hikâye başlığı en fazla {SiteSnapshot.StoryTitleMaxLength} karakter olabilir.");
        RuleFor(x => x.About).MaximumLength(SiteSnapshot.AboutMaxLength)
            .WithMessage($"Hikâye en fazla {SiteSnapshot.AboutMaxLength} karakter olabilir.");
        RuleFor(x => x.HoursNote).MaximumLength(Branch.HoursNoteMaxLength)
            .WithMessage($"Saat notu en fazla {Branch.HoursNoteMaxLength} karakter olabilir.");
        RuleFor(x => x.InstagramUrl).MaximumLength(SiteSnapshot.InstagramUrlMaxLength)
            .WithMessage($"Instagram adresi en fazla {SiteSnapshot.InstagramUrlMaxLength} karakter olabilir.");
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

// ── Fotoğraf yükleme ortak adımı ────────────────────────────────────────────────────────────────
internal static class SiteImageUpload
{
    /// <summary>Görseli yükler; hata olursa kullanıcıya gösterilecek mesajı döner.</summary>
    /// <param name="ownerId">Depodaki klasör: şirketin sitesi için şirket id'si.</param>
    public static async Task<(string Key, string? Error)> UploadAsync(IImageStorageService imageStorage, Stream content, Guid ownerId, int maxSize,
        CancellationToken cancellationToken)
    {
        try
        {
            return (await imageStorage.UploadAsync(content, ownerId, "site", maxSize, cancellationToken), null);
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
