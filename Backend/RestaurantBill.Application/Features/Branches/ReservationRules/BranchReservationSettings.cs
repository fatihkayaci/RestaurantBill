using System.Globalization;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Branches.ReservationRules;

// Admin "Rezervasyonlar → Rezervasyon ayarları": oturumdaki şubenin rezervasyon kuralları.

// ── Oku ─────────────────────────────────────────────────────────────────────────────────────────
public class GetBranchReservationSettingsQuery : IRequest<Result<ReservationRulesDto>>
{
}

public class GetBranchReservationSettingsQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<GetBranchReservationSettingsQuery, Result<ReservationRulesDto>>
{
    public async Task<Result<ReservationRulesDto>> Handle(GetBranchReservationSettingsQuery request, CancellationToken cancellationToken)
    {
        Branch? branch = await db.Branches.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == currentUser.BranchId && !b.IsDeleted, cancellationToken);
        if (branch is null) return Result<ReservationRulesDto>.Failure("Şube bulunamadı.");

        return Result<ReservationRulesDto>.Success(ReservationRulesDto.From(branch));
    }
}

// ── Kaydet / varsayılana dön ────────────────────────────────────────────────────────────────────
public class UpdateBranchReservationSettingsCommand : IRequest<Result<ReservationRulesDto>>
{
    public bool Enabled { get; set; }
    public int SlotIntervalMinutes { get; set; }
    public int DurationMinutes { get; set; }
    public int MaxDaysAhead { get; set; }
    public int MaxPartySize { get; set; }
    public List<ReservationDayDto> Days { get; set; } = [];
    /// <summary>true: kayıtlı ayar silinir, şube varsayılanlara döner (diğer alanlar yok sayılır).</summary>
    public bool ResetToDefaults { get; set; }
}

public class UpdateBranchReservationSettingsCommandValidator : AbstractValidator<UpdateBranchReservationSettingsCommand>
{
    private const string TimePattern = @"^([01]\d|2[0-3]):[0-5]\d$";

    public UpdateBranchReservationSettingsCommandValidator()
    {
        When(x => !x.ResetToDefaults, () =>
        {
            RuleFor(x => x.SlotIntervalMinutes)
                .Must(v => ReservationSettings.AllowedIntervals.Contains(v))
                .WithMessage("Saat aralığı 15, 30 ya da 60 dakika olmalı.");
            RuleFor(x => x.DurationMinutes)
                .Must(v => v >= ReservationSettings.DurationMin && v <= ReservationSettings.DurationMax && v % ReservationSettings.DurationStep == 0)
                .WithMessage($"Masada kalma süresi {ReservationSettings.DurationMin}–{ReservationSettings.DurationMax} dakika arasında ve {ReservationSettings.DurationStep} dakikanın katı olmalı.");
            RuleFor(x => x.MaxDaysAhead)
                .InclusiveBetween(ReservationSettings.DaysAheadMin, ReservationSettings.DaysAheadMax)
                .WithMessage($"En fazla kaç gün sonrası {ReservationSettings.DaysAheadMin}–{ReservationSettings.DaysAheadMax} arasında olmalı.");
            RuleFor(x => x.MaxPartySize)
                .InclusiveBetween(ReservationSettings.PartySizeMin, ReservationSettings.PartySizeMax)
                .WithMessage($"En fazla kişi sayısı {ReservationSettings.PartySizeMin}–{ReservationSettings.PartySizeMax} arasında olmalı.");
            RuleFor(x => x.Days)
                .Must(days => days.Count == 7 && days.Select(d => d.Day).Distinct().Count() == 7 && days.All(d => d.Day is >= 0 and <= 6))
                .WithMessage("Haftanın her günü için bir satır gönderilmeli.");
            RuleForEach(x => x.Days).ChildRules(day =>
            {
                day.RuleFor(d => d.FirstStart).Matches(TimePattern)
                    .WithMessage(d => $"{DayName(d.Day)}: ilk başlangıç saatini SS:DD biçiminde girin.");
                day.RuleFor(d => d.LastStart).Matches(TimePattern)
                    .WithMessage(d => $"{DayName(d.Day)}: son başlangıç saatini SS:DD biçiminde girin.");
            });
        });
    }

    private static string DayName(int day) => day is >= 0 and <= 6 ? ReservationSettings.DayName((DayOfWeek)day) : "Gün";
}

public class UpdateBranchReservationSettingsCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<UpdateBranchReservationSettingsCommand, Result<ReservationRulesDto>>
{
    public async Task<Result<ReservationRulesDto>> Handle(UpdateBranchReservationSettingsCommand request, CancellationToken cancellationToken)
    {
        Branch? branch = await db.Branches
            .FirstOrDefaultAsync(b => b.Id == currentUser.BranchId && !b.IsDeleted, cancellationToken);
        if (branch is null) return Result<ReservationRulesDto>.Failure("Şube bulunamadı.");

        if (request.ResetToDefaults)
        {
            branch.SetReservationSettings(null);
        }
        else
        {
            try
            {
                ReservationSettings settings = ReservationSettings.Create(
                    request.Enabled, request.SlotIntervalMinutes, request.DurationMinutes, request.MaxDaysAhead, request.MaxPartySize,
                    request.Days.Select(d => new ReservationDayHours(
                        (DayOfWeek)d.Day,
                        d.IsOpen,
                        TimeOnly.ParseExact(d.FirstStart, "HH:mm", CultureInfo.InvariantCulture),
                        TimeOnly.ParseExact(d.LastStart, "HH:mm", CultureInfo.InvariantCulture))));
                branch.SetReservationSettings(settings);
            }
            catch (DomainException ex)
            {
                return Result<ReservationRulesDto>.Failure(ex.Message);
            }
        }

        User? actor = await db.Users.FirstOrDefaultAsync(u => u.Id == currentUser.UserId, cancellationToken);
        ReservationSettings effective = branch.GetReservationSettings();
        db.AuditLogs.Add(AuditLog.Create(
            branch.Id,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            AuditLogSeverity.Info,
            "BranchReservationSettingsUpdated",
            request.ResetToDefaults
                ? $"{actor?.FullName} {branch.BranchName} şubesinin rezervasyon ayarlarını varsayılana döndürdü."
                : $"{actor?.FullName} {branch.BranchName} şubesinin rezervasyon ayarlarını güncelledi " +
                  $"({(effective.Enabled ? "açık" : "kapalı")}, {effective.SlotIntervalMinutes} dk aralık, {effective.DurationMinutes} dk süre).",
            nameof(Branch),
            branch.Id));

        await db.SaveChangesAsync(cancellationToken);
        return Result<ReservationRulesDto>.Success(ReservationRulesDto.From(branch));
    }
}
