using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CustomerSite.Public;

// Müşteri siteden masa + saat seçip rezervasyon talebi gönderir; restoran onaylayınca kesinleşir.
public class CreateReservationRequestCommand : IRequest<Result<ReservationStatusDto>>
{
    public Guid TableId { get; set; }
    public string GuestName { get; set; } = string.Empty;
    public string Contact { get; set; } = string.Empty;
    // Şubenin yerel saatiyle: "2026-11-14" ve "19:30".
    public string Date { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public int PartySize { get; set; }
    public string? Note { get; set; }
}

public class CreateReservationRequestCommandValidator : AbstractValidator<CreateReservationRequestCommand>
{
    public CreateReservationRequestCommandValidator()
    {
        RuleFor(x => x.TableId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir masa seçilmelidir.");
        RuleFor(x => x.GuestName)
            .NotEmpty().WithMessage("Ad soyad boş bırakılamaz.")
            .MaximumLength(100).WithMessage("Ad soyad en fazla 100 karakter olabilir.");
        RuleFor(x => x.Contact)
            .NotEmpty().WithMessage("Telefon numarası boş bırakılamaz.")
            .MaximumLength(30).WithMessage("Telefon numarası en fazla 30 karakter olabilir.")
            .Must(HasEnoughDigits).WithMessage("Geçerli bir telefon numarası giriniz.");
        RuleFor(x => x.Date)
            .Matches(@"^\d{4}-\d{2}-\d{2}$").WithMessage("Geçerli bir tarih seçin.");
        RuleFor(x => x.Time)
            .Matches(@"^([01]\d|2[0-3]):[0-5]\d$").WithMessage("Geçerli bir saat seçin.");
        RuleFor(x => x.PartySize)
            .InclusiveBetween(1, ReservationSettings.PartySizeMax).WithMessage($"Kişi sayısı 1 ile {ReservationSettings.PartySizeMax} arasında olmalı.");
        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Not en fazla 500 karakter olabilir.");
    }

    private static bool HasEnoughDigits(string? contact)
        => !string.IsNullOrWhiteSpace(contact) && contact.Count(char.IsDigit) is >= 10 and <= 13;
}

public class CreateReservationRequestCommandHandler(IAppDbContext db, ITenantResolver tenant, ITableNotificationService tableNotifications)
    : IRequestHandler<CreateReservationRequestCommand, Result<ReservationStatusDto>>
{
    public async Task<Result<ReservationStatusDto>> Handle(CreateReservationRequestCommand request, CancellationToken cancellationToken)
    {
        Company? company = await CustomerSiteScope.ResolveCompanyAsync(db, tenant, cancellationToken);
        if (company is null)
            return Result<ReservationStatusDto>.Failure("Restoran bulunamadı.");

        Table? table = await db.Tables
            .Include(t => t.Region).ThenInclude(r => r.Branch)
            .FirstOrDefaultAsync(t => t.Id == request.TableId && t.Region.Branch.CompanyId == company.Id, cancellationToken);

        if (table is null || table.Status == TableStatus.OutOfService)
            return Result<ReservationStatusDto>.Failure("Bu masa rezervasyona uygun değil.");

        Branch branch = table.Region.Branch;
        ReservationSettings settings = branch.GetReservationSettings();

        string? error = CustomerSiteScope.TryResolveSlot(settings, branch.TimeZoneId, request.Date, request.Time, DateTime.UtcNow, out DateTime startUtc, out DateTime endUtc);
        if (error is not null)
            return Result<ReservationStatusDto>.Failure(error);

        if (request.PartySize > settings.MaxPartySize)
            return Result<ReservationStatusDto>.Failure($"Online en fazla {settings.MaxPartySize} kişilik rezervasyon yapılabilir. Daha kalabalık gruplar için restoranı arayın.");

        List<Reservation> overlapping = await CustomerSiteScope.FindOverlappingAsync(
            db, [table.Id], startUtc, endUtc, CustomerSiteScope.BlockingStatuses, cancellationToken);
        if (overlapping.Count > 0)
            return Result<ReservationStatusDto>.Failure("Bu masa seçtiğiniz saatte dolu. Başka bir masa ya da saat seçin.");

        Reservation reservation = Reservation.CreateRequest(table, request.GuestName, request.Contact, startUtc, endUtc, request.PartySize, request.Note);
        db.Reservations.Add(reservation);
        await db.SaveChangesAsync(cancellationToken);

        await tableNotifications.SendCustomerRequestsChangedAsync(branch.Id);

        TimeZoneInfo zone = CustomerSiteScope.ZoneOf(branch.TimeZoneId);
        return Result<ReservationStatusDto>.Success(new ReservationStatusDto
        {
            Id = reservation.Id,
            Status = (int)reservation.Status,
            TableName = table.Name,
            GuestName = reservation.GuestName,
            PartySize = reservation.PartySize,
            Date = CustomerSiteScope.LocalDate(startUtc, zone),
            Time = CustomerSiteScope.LocalTime(startUtc, zone),
            EndTime = CustomerSiteScope.LocalTime(endUtc, zone)
        });
    }
}
