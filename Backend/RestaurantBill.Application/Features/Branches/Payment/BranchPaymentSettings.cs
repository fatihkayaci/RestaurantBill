using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Branches.Payment;

// Oturumdaki şubenin IBAN bilgisi: admin Ayarlar → Ödeme'de düzenler, kasiyer IBAN ile ödemede QR'a yazar. Admin isterse
// aynı hesap masa QR sayfasında "IBAN ile öde" olarak da gösterilir (ShowIbanOnTable; varsayılan kapalı).

public class BranchPaymentSettingsDto
{
    /// <summary>Boşluksuz "TR..."; tanımlı değilse boş.</summary>
    public string Iban { get; set; } = string.Empty;
    /// <summary>"TR33 0006 ..." biçiminde, ekranda göstermek için.</summary>
    public string IbanFormatted { get; set; } = string.Empty;
    public string AccountHolderName { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    /// <summary>Masa QR sayfasında "IBAN ile öde" açık mı.</summary>
    public bool ShowIbanOnTable { get; set; }

    public static BranchPaymentSettingsDto From(Branch branch) => new()
    {
        Iban = branch.Iban,
        IbanFormatted = branch.HasIban ? TurkishIban.Format(branch.Iban) : string.Empty,
        AccountHolderName = branch.IbanHolderName,
        BankName = branch.PaymentBankName,
        ShowIbanOnTable = branch.ShowIbanOnTable,
    };
}

// ── Oku ─────────────────────────────────────────────────────────────────────────────────────────
public class GetBranchPaymentSettingsQuery : IRequest<Result<BranchPaymentSettingsDto>>
{
}

public class GetBranchPaymentSettingsQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<GetBranchPaymentSettingsQuery, Result<BranchPaymentSettingsDto>>
{
    public async Task<Result<BranchPaymentSettingsDto>> Handle(GetBranchPaymentSettingsQuery request, CancellationToken cancellationToken)
    {
        Branch? branch = await db.Branches.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == currentUser.BranchId && !b.IsDeleted, cancellationToken);
        if (branch is null) return Result<BranchPaymentSettingsDto>.Failure("Şube bulunamadı.");

        return Result<BranchPaymentSettingsDto>.Success(BranchPaymentSettingsDto.From(branch));
    }
}

// ── Kaydet ──────────────────────────────────────────────────────────────────────────────────────
public class UpdateBranchPaymentSettingsCommand : IRequest<Result<BranchPaymentSettingsDto>>
{
    /// <summary>Boş bırakılırsa (hesap sahibiyle birlikte) IBAN kaldırılır.</summary>
    public string Iban { get; set; } = string.Empty;
    public string AccountHolderName { get; set; } = string.Empty;
    /// <summary>İsteğe bağlı.</summary>
    public string BankName { get; set; } = string.Empty;
    /// <summary>Masa QR sayfasında "IBAN ile öde"; geçerli IBAN ve hesap sahibi olmadan açılamaz.</summary>
    public bool ShowIbanOnTable { get; set; }
}

public class UpdateBranchPaymentSettingsCommandValidator : AbstractValidator<UpdateBranchPaymentSettingsCommand>
{
    public UpdateBranchPaymentSettingsCommandValidator()
    {
        RuleFor(x => x.Iban)
            .Must(TurkishIban.IsValid).WithMessage("Geçerli bir IBAN girin: TR ile başlayan 26 karakter.")
            .When(x => !string.IsNullOrWhiteSpace(x.Iban));

        RuleFor(x => x.AccountHolderName)
            .NotEmpty().WithMessage("Hesap sahibinin adını girin.")
            .When(x => !string.IsNullOrWhiteSpace(x.Iban));

        RuleFor(x => x.AccountHolderName)
            .MaximumLength(Branch.IbanHolderNameMaxLength)
            .WithMessage($"Hesap sahibi adı en fazla {Branch.IbanHolderNameMaxLength} karakter olabilir.");

        RuleFor(x => x.BankName)
            .MaximumLength(Branch.PaymentBankNameMaxLength)
            .WithMessage($"Banka adı en fazla {Branch.PaymentBankNameMaxLength} karakter olabilir.");

        RuleFor(x => x.ShowIbanOnTable)
            .Must((command, show) => !show || (TurkishIban.IsValid(command.Iban) && !string.IsNullOrWhiteSpace(command.AccountHolderName)))
            .WithMessage("QR menüde göstermek için önce geçerli bir IBAN ve hesap sahibi girin.");
    }
}

public class UpdateBranchPaymentSettingsCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<UpdateBranchPaymentSettingsCommand, Result<BranchPaymentSettingsDto>>
{
    public async Task<Result<BranchPaymentSettingsDto>> Handle(UpdateBranchPaymentSettingsCommand request, CancellationToken cancellationToken)
    {
        Branch? branch = await db.Branches
            .FirstOrDefaultAsync(b => b.Id == currentUser.BranchId && !b.IsDeleted, cancellationToken);
        if (branch is null) return Result<BranchPaymentSettingsDto>.Failure("Şube bulunamadı.");

        try
        {
            branch.SetIban(request.Iban, request.AccountHolderName, request.BankName);
            branch.SetShowIbanOnTable(request.ShowIbanOnTable);
        }
        catch (DomainException ex)
        {
            return Result<BranchPaymentSettingsDto>.Failure(ex.Message);
        }

        User? actor = await db.Users.FirstOrDefaultAsync(u => u.Id == currentUser.UserId, cancellationToken);
        db.AuditLogs.Add(AuditLog.Create(
            branch.Id,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            AuditLogSeverity.Info,
            "BranchIbanUpdated",
            branch.HasIban
                ? $"{actor?.FullName} {branch.BranchName} şubesinin IBAN bilgisini güncelledi ({branch.IbanHolderName}, …{branch.Iban[^4..]}; " +
                  $"QR menüde {(branch.ShowIbanOnTable ? "gösteriliyor" : "gösterilmiyor")})."
                : $"{actor?.FullName} {branch.BranchName} şubesinin IBAN bilgisini kaldırdı.",
            nameof(Branch),
            branch.Id));

        await db.SaveChangesAsync(cancellationToken);
        return Result<BranchPaymentSettingsDto>.Success(BranchPaymentSettingsDto.From(branch));
    }
}
