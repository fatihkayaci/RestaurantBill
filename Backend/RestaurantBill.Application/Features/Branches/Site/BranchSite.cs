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

// ── Oku ─────────────────────────────────────────────────────────────────────────────────────────
public class GetBranchSiteQuery : IRequest<Result<BranchSiteDto>>
{
}

public class GetBranchSiteQueryHandler(IAppDbContext db, ICurrentUserService currentUser, IOptions<BunnyStorageOptions> storageOptions)
    : IRequestHandler<GetBranchSiteQuery, Result<BranchSiteDto>>
{
    public async Task<Result<BranchSiteDto>> Handle(GetBranchSiteQuery request, CancellationToken cancellationToken)
    {
        Branch? branch = await db.Branches.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == currentUser.BranchId && !b.IsDeleted, cancellationToken);
        if (branch is null) return Result<BranchSiteDto>.Failure("Şube bulunamadı.");

        return Result<BranchSiteDto>.Success(BranchSiteDto.From(branch, storageOptions.Value.CdnBaseUrl.TrimEnd('/')));
    }
}

// ── Metinleri ve saatleri kaydet ────────────────────────────────────────────────────────────────
public class UpdateBranchSiteCommand : IRequest<Result<BranchSiteDto>>
{
    public string Headline { get; set; } = string.Empty;
    public string Tagline { get; set; } = string.Empty;
    public string StoryTitle { get; set; } = string.Empty;
    public string About { get; set; } = string.Empty;
    /// <summary>"HH:mm" ya da boş.</summary>
    public string? OpensAt { get; set; }
    public string? ClosesAt { get; set; }
    public string HoursNote { get; set; } = string.Empty;
    public string InstagramUrl { get; set; } = string.Empty;
    public string AccentColor { get; set; } = string.Empty;
}

public class UpdateBranchSiteCommandValidator : AbstractValidator<UpdateBranchSiteCommand>
{
    public UpdateBranchSiteCommandValidator()
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
    }

    private static bool BeTimeOrEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) || TimeOnly.TryParseExact(value, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
}

public class UpdateBranchSiteCommandHandler(IAppDbContext db, ICurrentUserService currentUser, IOptions<BunnyStorageOptions> storageOptions)
    : IRequestHandler<UpdateBranchSiteCommand, Result<BranchSiteDto>>
{
    public async Task<Result<BranchSiteDto>> Handle(UpdateBranchSiteCommand request, CancellationToken cancellationToken)
    {
        Branch? branch = await db.Branches
            .FirstOrDefaultAsync(b => b.Id == currentUser.BranchId && !b.IsDeleted, cancellationToken);
        if (branch is null) return Result<BranchSiteDto>.Failure("Şube bulunamadı.");

        try
        {
            branch.UpdateSite(request.Headline, request.Tagline, request.StoryTitle, request.About,
                ParseTime(request.OpensAt), ParseTime(request.ClosesAt),
                request.HoursNote, request.InstagramUrl, request.AccentColor);
        }
        catch (DomainException ex)
        {
            return Result<BranchSiteDto>.Failure(ex.Message);
        }

        await db.SaveChangesAsync(cancellationToken);
        return Result<BranchSiteDto>.Success(BranchSiteDto.From(branch, storageOptions.Value.CdnBaseUrl.TrimEnd('/')));
    }

    private static TimeOnly? ParseTime(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : TimeOnly.ParseExact(value, "HH:mm", CultureInfo.InvariantCulture);
}

// ── Fotoğraf yükle / kaldır ─────────────────────────────────────────────────────────────────────
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
    // Kapak tam ekran gösterildiği için büyük, hikâye fotoğrafı yarım genişlikte.
    private const int CoverMaxSize = 2000;
    private const int AboutMaxSize = 1400;

    public async Task<Result<BranchSiteDto>> Handle(SetBranchSiteImageCommand request, CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(request.Slot)) return Result<BranchSiteDto>.Failure("Geçersiz görsel alanı.");

        Branch? branch = await db.Branches
            .FirstOrDefaultAsync(b => b.Id == currentUser.BranchId && !b.IsDeleted, cancellationToken);
        if (branch is null) return Result<BranchSiteDto>.Failure("Şube bulunamadı.");

        string newKey = string.Empty;
        if (request.Content is not null)
        {
            try
            {
                int maxSize = request.Slot == SiteImageSlot.Cover ? CoverMaxSize : AboutMaxSize;
                newKey = await imageStorage.UploadAsync(request.Content, branch.Id, "site", maxSize, cancellationToken);
            }
            catch
            {
                return Result<BranchSiteDto>.Failure("Görsel dosyası işlenemedi. Lütfen geçerli bir resim yükleyin.");
            }
        }

        string previousKey = branch.ReplaceSiteImage(request.Slot, newKey);
        await db.SaveChangesAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(previousKey))
        {
            try { await imageStorage.DeleteAsync(previousKey, cancellationToken); }
            catch { /* Yeni durum kaydedildi; eski dosyanın kalması isteği bozmamalı. */ }
        }

        return Result<BranchSiteDto>.Success(BranchSiteDto.From(branch, storageOptions.Value.CdnBaseUrl.TrimEnd('/')));
    }
}
