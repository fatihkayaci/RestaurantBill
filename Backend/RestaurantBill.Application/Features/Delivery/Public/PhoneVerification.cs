using System.Security.Cryptography;
using System.Text;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Delivery.Public;

// Kod ve doğrulama anahtarı veritabanında yalnızca SHA-256 özetiyle durur. Kod numaraya bağlanarak özetlenir: aynı
// kod iki numarada aynı özeti vermez.
public static class PhoneVerificationHasher
{
    public static string HashCode(string normalizedPhone, string code) => Sha256($"{normalizedPhone}:{code}");

    public static string HashToken(string token) => Sha256(token);

    public static string NewCode() => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

    private static string Sha256(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}

public static class PhoneVerificationRules
{
    /// <summary>Aynı numaraya iki kod arasında beklenecek süre.</summary>
    public static readonly TimeSpan ResendCooldown = TimeSpan.FromSeconds(60);
    /// <summary>Bir numaraya bir saatte gönderilebilecek en fazla kod.</summary>
    public const int MaxCodesPerHour = 5;
    public const string NotRequiredMessage = "Bu restoran telefon doğrulaması istemiyor.";
}

// ── Kod gönder ──────────────────────────────────────────────────────────────────────────────────
public class SendPhoneVerificationCommand : IRequest<Result<PhoneVerificationSentDto>>
{
    public Guid? BranchId { get; set; }
    public string Phone { get; set; } = string.Empty;
}

public class SendPhoneVerificationCommandValidator : AbstractValidator<SendPhoneVerificationCommand>
{
    public SendPhoneVerificationCommandValidator()
    {
        RuleFor(x => x.Phone).Must(TurkishPhone.IsValid).WithMessage("Geçerli bir telefon numarası girin.");
    }
}

public class SendPhoneVerificationCommandHandler(IAppDbContext db, ITenantResolver tenant, ISmsSender sms, TimeProvider clock)
    : IRequestHandler<SendPhoneVerificationCommand, Result<PhoneVerificationSentDto>>
{
    public async Task<Result<PhoneVerificationSentDto>> Handle(SendPhoneVerificationCommand request, CancellationToken cancellationToken)
    {
        var (company, branch, _) = await PublicDeliveryContext.ResolveAsync(db, tenant, request.BranchId, cancellationToken);
        if (company is null || branch is null)
            return Result<PhoneVerificationSentDto>.Failure(DeliveryScope.RestaurantNotFoundMessage);

        // Doğrulama istemeyen şubede SMS gönderilmez: uç, başkasının numarasına SMS yağdırmak için kullanılamasın.
        OnlineOrderSettings settings = branch.GetOnlineOrderSettings();
        if (!settings.Enabled || !PublicDeliveryContext.RequiresPhoneVerification(settings, sms))
            return Result<PhoneVerificationSentDto>.Failure(PhoneVerificationRules.NotRequiredMessage);

        string phone = TurkishPhone.Normalize(request.Phone);
        if (phone.Length == 0)
            return Result<PhoneVerificationSentDto>.Failure("Geçerli bir telefon numarası girin.");

        bool blocked = await db.BlockedPhones.AsNoTracking()
            .AnyAsync(b => b.BranchId == branch.Id && b.Phone == phone && !b.IsDeleted, cancellationToken);
        if (blocked)
            return Result<PhoneVerificationSentDto>.Failure(BlockedPhone.CustomerMessage);

        DateTime now = clock.GetUtcNow().UtcDateTime;
        DateTime hourAgo = now.AddHours(-1);
        List<DateTime> recent = await db.CustomerPhoneVerifications.AsNoTracking()
            .Where(v => v.BranchId == branch.Id && v.Phone == phone && v.CreatedAt >= hourAgo)
            .Select(v => v.CreatedAt)
            .ToListAsync(cancellationToken);

        if (recent.Count > 0)
        {
            TimeSpan wait = recent.Max() + PhoneVerificationRules.ResendCooldown - now;
            if (wait > TimeSpan.Zero)
                return Result<PhoneVerificationSentDto>.Failure($"Yeni kod için {Math.Ceiling(wait.TotalSeconds):0} saniye bekleyin.");
        }
        if (recent.Count >= PhoneVerificationRules.MaxCodesPerHour)
            return Result<PhoneVerificationSentDto>.Failure("Bu numaraya çok fazla kod gönderildi. Lütfen daha sonra tekrar deneyin.");

        // Bekleyen eski kodlar geçersizleşir; yalnızca son kod doğrulanabilir.
        List<CustomerPhoneVerification> pending = await db.CustomerPhoneVerifications
            .Where(v => v.BranchId == branch.Id && v.Phone == phone && v.Status == VerificationCodeStatus.Pending)
            .ToListAsync(cancellationToken);
        foreach (CustomerPhoneVerification old in pending)
            old.MarkAsDeleted();

        string code = PhoneVerificationHasher.NewCode();
        db.CustomerPhoneVerifications.Add(CustomerPhoneVerification.Create(branch.Id, phone, PhoneVerificationHasher.HashCode(phone, code), now));
        await db.SaveChangesAsync(cancellationToken);

        await sms.SendAsync(phone, $"{branch.BranchName} sipariş doğrulama kodunuz: {code}. Kod {CustomerPhoneVerification.CodeLifetime.TotalMinutes:0} dakika geçerlidir.");

        return Result<PhoneVerificationSentDto>.Success(new PhoneVerificationSentDto
        {
            ExpiresInSeconds = (int)CustomerPhoneVerification.CodeLifetime.TotalSeconds,
            ResendAfterSeconds = (int)PhoneVerificationRules.ResendCooldown.TotalSeconds
        });
    }
}

// ── Kodu doğrula: başarılıysa sipariş için tek kullanımlık anahtar ─────────────────────────────────
public class VerifyPhoneCommand : IRequest<Result<PhoneVerifiedDto>>
{
    public Guid? BranchId { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}

public class VerifyPhoneCommandValidator : AbstractValidator<VerifyPhoneCommand>
{
    public VerifyPhoneCommandValidator()
    {
        RuleFor(x => x.Phone).Must(TurkishPhone.IsValid).WithMessage("Geçerli bir telefon numarası girin.");
        RuleFor(x => x.Code).Matches("^[0-9]{6}$").WithMessage("Size gönderilen 6 haneli kodu girin.");
    }
}

public class VerifyPhoneCommandHandler(IAppDbContext db, ITenantResolver tenant, TimeProvider clock)
    : IRequestHandler<VerifyPhoneCommand, Result<PhoneVerifiedDto>>
{
    public async Task<Result<PhoneVerifiedDto>> Handle(VerifyPhoneCommand request, CancellationToken cancellationToken)
    {
        var (company, branch, _) = await PublicDeliveryContext.ResolveAsync(db, tenant, request.BranchId, cancellationToken);
        if (company is null || branch is null)
            return Result<PhoneVerifiedDto>.Failure(DeliveryScope.RestaurantNotFoundMessage);

        string phone = TurkishPhone.Normalize(request.Phone);
        CustomerPhoneVerification? verification = await db.CustomerPhoneVerifications
            .Where(v => v.BranchId == branch.Id && v.Phone == phone && v.Status == VerificationCodeStatus.Pending && !v.IsDeleted)
            .OrderByDescending(v => v.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (verification is null)
            return Result<PhoneVerifiedDto>.Failure("Bu numara için geçerli bir kod yok, yeni kod isteyin.");

        string token = AccessToken.New();
        bool verified;
        try
        {
            verified = verification.Verify(PhoneVerificationHasher.HashCode(phone, request.Code.Trim()), PhoneVerificationHasher.HashToken(token),
                clock.GetUtcNow().UtcDateTime);
        }
        catch (DomainException ex)
        {
            // Süresi dolan kod "Expired" olarak kaydedilir.
            await db.SaveChangesAsync(cancellationToken);
            return Result<PhoneVerifiedDto>.Failure(ex.Message);
        }

        await db.SaveChangesAsync(cancellationToken);

        if (!verified)
        {
            int left = CustomerPhoneVerification.MaxAttempts - verification.Attempts;
            return Result<PhoneVerifiedDto>.Failure(left > 0
                ? $"Kod hatalı. {left} deneme hakkınız kaldı."
                : "Çok fazla hatalı deneme yapıldı, yeni kod isteyin.");
        }

        return Result<PhoneVerifiedDto>.Success(new PhoneVerifiedDto
        {
            VerificationToken = token,
            ExpiresInSeconds = (int)CustomerPhoneVerification.TokenLifetime.TotalSeconds
        });
    }
}
