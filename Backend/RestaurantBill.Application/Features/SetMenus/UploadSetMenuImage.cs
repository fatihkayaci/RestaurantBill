using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.SetMenus;

/// <summary>Menü görselini yükler (ürün görseliyle aynı depo ve kurallar). Dönen değer görselin tam CDN adresi.</summary>
public class UploadSetMenuImageCommand : IRequest<Result<string>>
{
    public Guid SetMenuId { get; set; }
    public Stream Content { get; set; } = Stream.Null;
    public string ContentType { get; set; } = string.Empty;
    public long Length { get; set; }
}

public class UploadSetMenuImageCommandValidator : AbstractValidator<UploadSetMenuImageCommand>
{
    private static readonly string[] AllowedContentTypes = ["image/jpeg", "image/png", "image/webp"];
    private const long MaxFileSizeBytes = 5 * 1024 * 1024;

    public UploadSetMenuImageCommandValidator()
    {
        RuleFor(x => x.SetMenuId)
            .NotEqual(Guid.Empty).WithMessage("Geçersiz bir menü seçtiniz.");

        RuleFor(x => x.Length)
            .GreaterThan(0).WithMessage("Dosya boş olamaz.")
            .LessThanOrEqualTo(MaxFileSizeBytes).WithMessage("Dosya boyutu 5 MB'ı aşamaz.");

        RuleFor(x => x.ContentType)
            .Must(ct => AllowedContentTypes.Contains(ct, StringComparer.OrdinalIgnoreCase))
            .WithMessage("Sadece JPEG, PNG veya WebP formatında görsel yükleyebilirsiniz.");
    }
}

public class UploadSetMenuImageCommandHandler(
    IAppDbContext db, ICurrentUserService currentUser, IImageStorageService imageStorage, IOptions<BunnyStorageOptions> storageOptions)
    : IRequestHandler<UploadSetMenuImageCommand, Result<string>>
{
    public async Task<Result<string>> Handle(UploadSetMenuImageCommand request, CancellationToken cancellationToken)
    {
        // Ürün görseliyle aynı kural: yalnızca aktif şubenin menüsüne yüklenir (dosya o şubenin klasörüne gider).
        SetMenu? setMenu = await db.SetMenus
            .FirstOrDefaultAsync(s => s.Id == request.SetMenuId && s.BranchId == currentUser.BranchId, cancellationToken);
        if (setMenu is null)
            return Result<string>.Failure("Böyle bir menü bulunamadı.");

        string newKey;
        try
        {
            newKey = await imageStorage.UploadAsync(request.Content, currentUser.BranchId, cancellationToken);
        }
        catch (ImageUploadException ex)
        {
            return Result<string>.Failure(ex.Message);
        }
        catch
        {
            return Result<string>.Failure("Görsel dosyası işlenemedi. Lütfen geçerli bir resim yükleyin.");
        }

        string previousKey = setMenu.ImageUrl;
        setMenu.UpdateImage(newKey);
        await db.AddSetMenuAuditLogAsync(currentUser, setMenu, "SetMenuImageUpdated", $"{setMenu.Name} menüsünün görselini güncelledi.", AuditLogSeverity.Info, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(previousKey))
        {
            try
            {
                await imageStorage.DeleteAsync(previousKey, cancellationToken);
            }
            catch
            {
                // Yeni görsel kaydedildi; eski dosya silinemezse isteği başarısız saymayız.
            }
        }

        return Result<string>.Success($"{storageOptions.Value.CdnBaseUrl.TrimEnd('/')}/{newKey}");
    }
}
