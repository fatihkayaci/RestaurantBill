using System.Globalization;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Delivery.Settings;

// Admin "Online sipariş → Genel / Çalışma saatleri": oturumdaki şubenin online sipariş kuralları.
internal static class OnlineOrderSettingsMapping
{
    public static OnlineOrderSettingsDto ToDto(Branch branch, bool smsConfigured)
    {
        OnlineOrderSettings s = branch.GetOnlineOrderSettings();
        return new OnlineOrderSettingsDto
        {
            Enabled = s.Enabled,
            Paused = branch.OnlineOrdersPaused,
            Days = s.Days.Select(d => new OnlineOrderDayDto
            {
                Day = (int)d.Day,
                IsOpen = d.IsOpen,
                Opens = d.Opens.ToString("HH:mm", CultureInfo.InvariantCulture),
                Closes = d.Closes.ToString("HH:mm", CultureInfo.InvariantCulture)
            }).ToList(),
            LastOrderMinutesBeforeClose = s.LastOrderMinutesBeforeClose,
            DefaultEtaMinutes = s.DefaultEtaMinutes,
            AutoRejectAfterMinutes = s.AutoRejectAfterMinutes,
            MaxOpenOrdersPerPhone = s.MaxOpenOrdersPerPhone,
            MaxOrdersPerPhonePerDay = s.MaxOrdersPerPhonePerDay,
            AcceptCash = s.AcceptCash,
            AcceptCard = s.AcceptCard,
            AcceptIban = s.AcceptIban,
            HasIban = branch.HasPayableIban,
            RequirePhoneVerification = s.RequirePhoneVerification,
            SmsConfigured = smsConfigured,
            PreOrderEnabled = s.PreOrderEnabled,
            PreOrderLeadMinutes = s.PreOrderLeadMinutes,
            IsCustomized = branch.OnlineOrderSettings is not null
        };
    }
}

// ── Oku ─────────────────────────────────────────────────────────────────────────────────────────
public class GetOnlineOrderSettingsQuery : IRequest<Result<OnlineOrderSettingsDto>>
{
}

public class GetOnlineOrderSettingsQueryHandler(IAppDbContext db, ICurrentUserService currentUser, ISmsSender sms)
    : IRequestHandler<GetOnlineOrderSettingsQuery, Result<OnlineOrderSettingsDto>>
{
    public async Task<Result<OnlineOrderSettingsDto>> Handle(GetOnlineOrderSettingsQuery request, CancellationToken cancellationToken)
    {
        Branch? branch = await db.Branches.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == currentUser.BranchId && !b.IsDeleted, cancellationToken);
        if (branch is null) return Result<OnlineOrderSettingsDto>.Failure("Şube bulunamadı.");

        return Result<OnlineOrderSettingsDto>.Success(OnlineOrderSettingsMapping.ToDto(branch, sms.IsConfigured));
    }
}

// ── Kaydet / varsayılana dön ────────────────────────────────────────────────────────────────────
public class UpdateOnlineOrderSettingsCommand : IRequest<Result<OnlineOrderSettingsDto>>
{
    public bool Enabled { get; set; }
    public List<OnlineOrderDayDto> Days { get; set; } = [];
    public int LastOrderMinutesBeforeClose { get; set; }
    public int DefaultEtaMinutes { get; set; }
    public int AutoRejectAfterMinutes { get; set; }
    public int MaxOpenOrdersPerPhone { get; set; }
    public int MaxOrdersPerPhonePerDay { get; set; }
    public bool AcceptCash { get; set; }
    public bool AcceptCard { get; set; }
    /// <summary>IBAN ile ödeme (havale/EFT); açmak için şubede geçerli IBAN ve hesap sahibi kayıtlı olmalı.</summary>
    public bool AcceptIban { get; set; }
    public bool RequirePhoneVerification { get; set; }
    public bool PreOrderEnabled { get; set; }
    public int PreOrderLeadMinutes { get; set; }
    /// <summary>true: kayıtlı ayar silinir, şube varsayılanlara (online sipariş kapalı) döner; diğer alanlar yok sayılır.</summary>
    public bool ResetToDefaults { get; set; }
}

public class UpdateOnlineOrderSettingsCommandValidator : AbstractValidator<UpdateOnlineOrderSettingsCommand>
{
    private const string TimePattern = @"^([01]\d|2[0-3]):[0-5]\d$";

    public UpdateOnlineOrderSettingsCommandValidator()
    {
        When(x => !x.ResetToDefaults, () =>
        {
            RuleFor(x => x.Days)
                .Must(days => days is not null && days.Count == 7 && days.Select(d => d.Day).Distinct().Count() == 7 && days.All(d => d.Day is >= 0 and <= 6))
                .WithMessage("Haftanın her günü için bir satır gönderilmeli.");
            RuleForEach(x => x.Days).ChildRules(day =>
            {
                day.RuleFor(d => d.Opens).Matches(TimePattern)
                    .WithMessage(d => $"{DayName(d.Day)}: açılış saatini SS:DD biçiminde girin.");
                day.RuleFor(d => d.Closes).Matches(TimePattern)
                    .WithMessage(d => $"{DayName(d.Day)}: kapanış saatini SS:DD biçiminde girin.");
            });
        });
    }

    private static string DayName(int day) => day is >= 0 and <= 6 ? ReservationSettings.DayName((DayOfWeek)day) : "Gün";
}

public class UpdateOnlineOrderSettingsCommandHandler(IAppDbContext db, ICurrentUserService currentUser, ISmsSender sms)
    : IRequestHandler<UpdateOnlineOrderSettingsCommand, Result<OnlineOrderSettingsDto>>
{
    public const string IbanMissingMessage = "IBAN ile ödemeyi açmak için önce Ayarlar → Ödeme'den IBAN ve hesap sahibini girin.";

    public async Task<Result<OnlineOrderSettingsDto>> Handle(UpdateOnlineOrderSettingsCommand request, CancellationToken cancellationToken)
    {
        Branch? branch = await db.Branches
            .FirstOrDefaultAsync(b => b.Id == currentUser.BranchId && !b.IsDeleted, cancellationToken);
        if (branch is null) return Result<OnlineOrderSettingsDto>.Failure("Şube bulunamadı.");

        if (request.ResetToDefaults)
        {
            branch.SetOnlineOrderSettings(null);
        }
        else
        {
            if (request.AcceptIban && !branch.HasPayableIban)
                return Result<OnlineOrderSettingsDto>.Failure(IbanMissingMessage);

            try
            {
                branch.SetOnlineOrderSettings(OnlineOrderSettings.Create(
                    request.Enabled,
                    request.Days.Select(d => new OnlineOrderDayHours(
                        (DayOfWeek)d.Day,
                        d.IsOpen,
                        TimeOnly.ParseExact(d.Opens, "HH:mm", CultureInfo.InvariantCulture),
                        TimeOnly.ParseExact(d.Closes, "HH:mm", CultureInfo.InvariantCulture))),
                    request.LastOrderMinutesBeforeClose,
                    request.DefaultEtaMinutes,
                    request.AutoRejectAfterMinutes,
                    request.MaxOpenOrdersPerPhone,
                    request.MaxOrdersPerPhonePerDay,
                    request.AcceptCash,
                    request.AcceptCard,
                    request.RequirePhoneVerification,
                    request.PreOrderEnabled,
                    request.PreOrderLeadMinutes,
                    request.AcceptIban));
            }
            catch (DomainException ex)
            {
                return Result<OnlineOrderSettingsDto>.Failure(ex.Message);
            }
        }

        string actor = await db.ActorNameAsync(currentUser, cancellationToken);
        OnlineOrderSettings effective = branch.GetOnlineOrderSettings();
        db.AuditLogs.Add(AuditLog.Create(
            branch.Id,
            actor,
            AuditLogCategory.System,
            AuditLogSeverity.Info,
            "BranchOnlineOrderSettingsUpdated",
            request.ResetToDefaults
                ? $"{actor} {branch.BranchName} şubesinin online sipariş ayarlarını varsayılana döndürdü."
                : $"{actor} {branch.BranchName} şubesinin online sipariş ayarlarını güncelledi " +
                  $"({(effective.Enabled ? "açık" : "kapalı")}, otomatik ret {effective.AutoRejectAfterMinutes} dk).",
            nameof(Branch),
            branch.Id));

        await db.SaveChangesAsync(cancellationToken);
        return Result<OnlineOrderSettingsDto>.Success(OnlineOrderSettingsMapping.ToDto(branch, sms.IsConfigured));
    }
}
