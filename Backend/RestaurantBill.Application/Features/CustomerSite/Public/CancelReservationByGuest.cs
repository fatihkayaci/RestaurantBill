using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CustomerSite.Public;

// Misafirin rezervasyonunu kendisi iptal etmesi (/rezervasyon/:token sayfasındaki "Rezervasyonu iptal et").
// Kimlik "Rezervasyon sorgula" ile aynı: kısa kod + rezervasyondaki telefon. Yanlış kod/telefon tek, genel mesaj alır ve
// ReservationLookupGuard'ın kod başına hatalı deneme sayacına yazılır. Yalnızca bekleyen ya da onaylı rezervasyon,
// rezervasyon saatinden Reservation.GuestCancelCutoff (2 saat) öncesine kadar iptal edilir; bekleyen ön sipariş de düşer.
public class CancelReservationByGuestCommand : IRequest<Result<ReservationDetailDto>>
{
    public string Code { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
}

public class CancelReservationByGuestCommandValidator : AbstractValidator<CancelReservationByGuestCommand>
{
    public CancelReservationByGuestCommandValidator()
    {
        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Rezervasyon kodunu girin.")
            .MaximumLength(20).WithMessage(LookupReservationCommandHandler.NotFoundMessage);
        RuleFor(x => x.Phone)
            .NotEmpty().WithMessage("Telefon numaranızı girin.")
            .MaximumLength(30).WithMessage(LookupReservationCommandHandler.NotFoundMessage);
    }
}

public class CancelReservationByGuestCommandHandler(
    IAppDbContext db, ITenantResolver tenant, ReservationLookupGuard guard, ITableNotificationService tableNotifications, TimeProvider clock)
    : IRequestHandler<CancelReservationByGuestCommand, Result<ReservationDetailDto>>
{
    public const string ActorName = "Online müşteri";

    public async Task<Result<ReservationDetailDto>> Handle(CancelReservationByGuestCommand request, CancellationToken cancellationToken)
    {
        string code = ReservationCode.Normalize(request.Code);
        string phone = TurkishPhone.Normalize(request.Phone);
        if (code.Length == 0 || phone.Length == 0)
            return Result<ReservationDetailDto>.Failure(LookupReservationCommandHandler.NotFoundMessage);

        if (guard.LockedFor(code) is not null)
            return Result<ReservationDetailDto>.Failure(LookupReservationCommandHandler.LockedMessage);

        Company? company = await CustomerSiteScope.ResolveCompanyAsync(db, tenant, cancellationToken);
        if (company is null)
            return Result<ReservationDetailDto>.Failure(LookupReservationCommandHandler.NotFoundMessage);

        Reservation? reservation = await db.Reservations
            .Include(r => r.Table).ThenInclude(t => t.Region).ThenInclude(r => r.Branch)
            .FirstOrDefaultAsync(r => r.Code == code
                && !r.IsDeleted
                && r.Table.Region.Branch.CompanyId == company.Id
                && !r.Table.Region.Branch.IsDeleted, cancellationToken);

        // Telefon kayıtta nasıl yazıldıysa aynı biçime getirilip karşılaştırılır (LookupReservation ile aynı).
        if (reservation is null || TurkishPhone.Normalize(reservation.Contact) != phone)
        {
            guard.RecordFailure(code);
            return Result<ReservationDetailDto>.Failure(LookupReservationCommandHandler.NotFoundMessage);
        }
        guard.Reset(code);

        DateTime now = clock.GetUtcNow().UtcDateTime;
        try
        {
            reservation.CancelByGuest(now);
        }
        catch (DomainException ex)
        {
            return Result<ReservationDetailDto>.Failure(ex.Message);
        }

        bool preOrderCancelled = await PreOrderRules.CancelPendingAsync(db, reservation.Id, cancellationToken);

        Guid branchId = reservation.Table.Region.BranchId;
        TimeZoneInfo zone = CustomerSiteScope.ZoneOf(reservation.Table.Region.Branch.TimeZoneId);
        db.AuditLogs.Add(AuditLog.Create(branchId, ActorName, AuditLogCategory.Order, AuditLogSeverity.Warning,
            "ReservationCancelledByGuest",
            $"{reservation.GuestName} {CustomerSiteScope.LocalDate(reservation.ReservationTime, zone)} {CustomerSiteScope.LocalTime(reservation.ReservationTime, zone)} "
                + $"rezervasyonunu ({reservation.Table.Name}) kendisi iptal etti.{(preOrderCancelled ? " Ön siparişi de iptal edildi." : string.Empty)}",
            nameof(Reservation), reservation.Id));

        await db.SaveChangesAsync(cancellationToken);
        // Personelin rezervasyon listesi diğer rezervasyon değişikliklerinde olduğu gibi canlı yenilenir.
        await tableNotifications.SendCustomerRequestsChangedAsync(branchId);
        await tableNotifications.SendCustomerActivityAsync(branchId, CustomerActivity.ForReservation(
            CustomerActivityDto.ReservationCancelled, reservation, reservation.Table, zone));

        return Result<ReservationDetailDto>.Success(await ReservationLink.BuildAsync(db, reservation, now, cancellationToken));
    }
}
