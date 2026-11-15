using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CustomerSite.Public;

// "Rezervasyon sorgula" (/rezervasyon-sorgula): bağlantısını kaybeden müşteri kısa kod + telefonla rezervasyon
// sayfasının anahtarını geri alır. Yanlış kod, yanlış telefon ya da ikisi birden: hep aynı mesaj; hangisinin yanlış
// olduğu söylenmez. Kod başına hatalı deneme sınırı ReservationLookupGuard'da, IP başına sınır rate-limit'te.
public class LookupReservationCommand : IRequest<Result<ReservationLookupResultDto>>
{
    public string Code { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
}

public class LookupReservationCommandValidator : AbstractValidator<LookupReservationCommand>
{
    public LookupReservationCommandValidator()
    {
        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Rezervasyon kodunu girin.")
            .MaximumLength(20).WithMessage(LookupReservationCommandHandler.NotFoundMessage);
        RuleFor(x => x.Phone)
            .NotEmpty().WithMessage("Telefon numaranızı girin.")
            .MaximumLength(30).WithMessage(LookupReservationCommandHandler.NotFoundMessage);
    }
}

public class LookupReservationCommandHandler(IAppDbContext db, ITenantResolver tenant, ReservationLookupGuard guard, TimeProvider clock)
    : IRequestHandler<LookupReservationCommand, Result<ReservationLookupResultDto>>
{
    public const string NotFoundMessage = "Bu bilgilerle bir rezervasyon bulunamadı.";
    public const string LockedMessage = "Çok fazla hatalı deneme yapıldı. Lütfen 15 dakika sonra tekrar deneyin.";

    /// <summary>Rezervasyon saatinin üzerinden bundan fazla gün geçtiyse kodla sorgulanamaz.</summary>
    public const int MaxAgeDays = 30;

    public async Task<Result<ReservationLookupResultDto>> Handle(LookupReservationCommand request, CancellationToken cancellationToken)
    {
        string code = ReservationCode.Normalize(request.Code);
        string phone = TurkishPhone.Normalize(request.Phone);
        // Biçimi tutmayan kod ya da telefon: hiçbir kayda bakılmaz, sayaç da işlemez (geçerli kod yoksa anahtar yok).
        if (code.Length == 0 || phone.Length == 0)
            return Result<ReservationLookupResultDto>.Failure(NotFoundMessage);

        if (guard.LockedFor(code) is not null)
            return Result<ReservationLookupResultDto>.Failure(LockedMessage);

        Company? company = await CustomerSiteScope.ResolveCompanyAsync(db, tenant, cancellationToken);
        if (company is null)
            return Result<ReservationLookupResultDto>.Failure(NotFoundMessage);

        DateTime oldest = clock.GetUtcNow().UtcDateTime.AddDays(-MaxAgeDays);
        var match = await db.Reservations.AsNoTracking()
            .Where(r => r.Code == code
                && !r.IsDeleted
                && r.ReservationTime >= oldest
                && r.Table.Region.Branch.CompanyId == company.Id
                && !r.Table.Region.Branch.IsDeleted)
            .Select(r => new { r.Id, r.AccessToken, r.Contact, r.GuestName, BranchId = r.Table.Region.BranchId })
            .FirstOrDefaultAsync(cancellationToken);

        // Telefon kayıtta nasıl yazıldıysa (0532…, +90 532…, 532…) aynı biçime getirilip karşılaştırılır.
        if (match is null || TurkishPhone.Normalize(match.Contact) != phone)
        {
            guard.RecordFailure(code);
            return Result<ReservationLookupResultDto>.Failure(NotFoundMessage);
        }

        guard.Reset(code);
        db.AuditLogs.Add(AuditLog.Create(match.BranchId, "Online müşteri", AuditLogCategory.Order, AuditLogSeverity.Info,
            "ReservationLookedUp", $"{match.GuestName} rezervasyonu kod ve telefonla sorgulandı ({ReservationCode.Format(code)}).",
            nameof(Reservation), match.Id));
        await db.SaveChangesAsync(cancellationToken);

        return Result<ReservationLookupResultDto>.Success(new ReservationLookupResultDto { AccessToken = match.AccessToken });
    }
}
