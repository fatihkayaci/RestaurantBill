using System.Globalization;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Branches.Site;

// Ayarlar → Saatler ve iletişim: restoran sitesinin şubeye ait bilgileri (çalışma saatleri, saat notu, WhatsApp, nasıl
// gelinir). Site şirket genelidir (SiteDraft.cs); bu bilgiler her şubenin kendisinindir ve taslaksız, hemen kaydedilir.
// Admin ve şube seçmiş sahip oturumdaki şubeyi düzenler.

public class BranchSiteInfoDto
{
    /// <summary>"HH:mm" ya da null (her gün aynı aralık; haftalık saat girildiyse en sık aralık).</summary>
    public string? OpensAt { get; set; }
    public string? ClosesAt { get; set; }
    public string HoursNote { get; set; } = string.Empty;
    /// <summary>Boş: "her gün aynı". Doluysa Pazartesi → Pazar 7 gün.</summary>
    public List<SiteDayHoursDto> WeeklyHours { get; set; } = [];
    public string WhatsappPhone { get; set; } = string.Empty;
    public string DirectionsNote { get; set; } = string.Empty;

    public static BranchSiteInfoDto From(Branch branch)
    {
        SiteContent info = branch.GetSiteContent();
        return new BranchSiteInfoDto
        {
            OpensAt = branch.OpensAt?.ToString("HH:mm", CultureInfo.InvariantCulture),
            ClosesAt = branch.ClosesAt?.ToString("HH:mm", CultureInfo.InvariantCulture),
            HoursNote = branch.HoursNote,
            WeeklyHours = info.WeeklyHours.Select(SiteDayHoursDto.From).ToList(),
            WhatsappPhone = info.WhatsappPhone,
            DirectionsNote = info.DirectionsNote,
        };
    }
}

internal static class BranchSiteInfoScope
{
    public const string NotFoundMessage = "Şube bulunamadı.";

    /// <summary>Oturumdaki şube ("Tümü" modunda şube yok: null).</summary>
    public static Task<Branch?> LoadAsync(IAppDbContext db, ICurrentUserService currentUser, bool tracking, CancellationToken cancellationToken)
    {
        IQueryable<Branch> query = tracking ? db.Branches : db.Branches.AsNoTracking();
        return query.FirstOrDefaultAsync(b => b.Id == currentUser.BranchId && b.CompanyId == currentUser.CompanyId && !b.IsDeleted,
            cancellationToken);
    }
}

public class GetBranchSiteInfoQuery : IRequest<Result<BranchSiteInfoDto>>
{
}

public class GetBranchSiteInfoQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<GetBranchSiteInfoQuery, Result<BranchSiteInfoDto>>
{
    public async Task<Result<BranchSiteInfoDto>> Handle(GetBranchSiteInfoQuery request, CancellationToken cancellationToken)
    {
        Branch? branch = await BranchSiteInfoScope.LoadAsync(db, currentUser, tracking: false, cancellationToken);
        return branch is null
            ? Result<BranchSiteInfoDto>.Failure(BranchSiteInfoScope.NotFoundMessage)
            : Result<BranchSiteInfoDto>.Success(BranchSiteInfoDto.From(branch));
    }
}

public class UpdateBranchSiteInfoCommand : IRequest<Result<BranchSiteInfoDto>>
{
    public string? OpensAt { get; set; }
    public string? ClosesAt { get; set; }
    public string HoursNote { get; set; } = string.Empty;
    public List<SiteDayHoursDto> WeeklyHours { get; set; } = [];
    public string WhatsappPhone { get; set; } = string.Empty;
    public string DirectionsNote { get; set; } = string.Empty;
}

public class UpdateBranchSiteInfoCommandValidator : AbstractValidator<UpdateBranchSiteInfoCommand>
{
    public UpdateBranchSiteInfoCommandValidator()
    {
        RuleFor(x => x.OpensAt).Must(BeTimeOrEmpty).WithMessage("Açılış saati SS:dd biçiminde olmalıdır.");
        RuleFor(x => x.ClosesAt).Must(BeTimeOrEmpty).WithMessage("Kapanış saati SS:dd biçiminde olmalıdır.");
        RuleFor(x => x.HoursNote).MaximumLength(Branch.HoursNoteMaxLength)
            .WithMessage($"Saat notu en fazla {Branch.HoursNoteMaxLength} karakter olabilir.");
        RuleFor(x => x.WeeklyHours).Must(w => w is null || w.Count == 0 || (w.Count == 7 && w.Select(d => d.Day).Distinct().Count() == 7))
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
    }

    private static bool BeTimeOrEmpty(string? value) => string.IsNullOrWhiteSpace(value) || BeTime(value);

    private static bool BeTime(string? value) =>
        TimeOnly.TryParseExact(value, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
}

public class UpdateBranchSiteInfoCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<UpdateBranchSiteInfoCommand, Result<BranchSiteInfoDto>>
{
    public async Task<Result<BranchSiteInfoDto>> Handle(UpdateBranchSiteInfoCommand request, CancellationToken cancellationToken)
    {
        Branch? branch = await BranchSiteInfoScope.LoadAsync(db, currentUser, tracking: true, cancellationToken);
        if (branch is null) return Result<BranchSiteInfoDto>.Failure(BranchSiteInfoScope.NotFoundMessage);

        try
        {
            branch.UpdateSiteInfo(
                ParseTime(request.OpensAt),
                ParseTime(request.ClosesAt),
                request.HoursNote ?? string.Empty,
                (request.WeeklyHours ?? []).Select(d => new SiteDayHours(
                    (DayOfWeek)d.Day, d.IsOpen,
                    TimeOnly.ParseExact(d.Opens, "HH:mm", CultureInfo.InvariantCulture),
                    TimeOnly.ParseExact(d.Closes, "HH:mm", CultureInfo.InvariantCulture))).ToList(),
                request.WhatsappPhone ?? string.Empty,
                request.DirectionsNote ?? string.Empty);
        }
        catch (DomainException ex)
        {
            return Result<BranchSiteInfoDto>.Failure(ex.Message);
        }

        await db.SaveChangesAsync(cancellationToken);
        return Result<BranchSiteInfoDto>.Success(BranchSiteInfoDto.From(branch));
    }

    private static TimeOnly? ParseTime(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : TimeOnly.ParseExact(value, "HH:mm", CultureInfo.InvariantCulture);
}
