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

/// <summary>
/// Menünün görselini hazır görsel kütüphanesinden seçer: menü yalnızca paylaşılan anahtarı saklar, dosya kopyalanmaz.
/// Dönen değer görselin tam CDN adresi.
/// </summary>
public class SetSetMenuStockImageCommand : IRequest<Result<string>>
{
    public Guid SetMenuId { get; set; }
    public Guid StockImageId { get; set; }
}

public class SetSetMenuStockImageCommandValidator : AbstractValidator<SetSetMenuStockImageCommand>
{
    public SetSetMenuStockImageCommandValidator()
    {
        RuleFor(x => x.SetMenuId).NotEqual(Guid.Empty).WithMessage("Geçersiz bir menü seçtiniz.");
        RuleFor(x => x.StockImageId).NotEqual(Guid.Empty).WithMessage("Geçersiz bir görsel seçtiniz.");
    }
}

public class SetSetMenuStockImageCommandHandler(
    IAppDbContext db, ICurrentUserService currentUser, IImageStorageService imageStorage, IOptions<BunnyStorageOptions> storageOptions)
    : IRequestHandler<SetSetMenuStockImageCommand, Result<string>>
{
    public async Task<Result<string>> Handle(SetSetMenuStockImageCommand request, CancellationToken cancellationToken)
    {
        // Görsel yüklemeyle aynı kural: yalnızca aktif şubenin menüsü.
        SetMenu? setMenu = await db.SetMenus
            .FirstOrDefaultAsync(s => s.Id == request.SetMenuId && s.BranchId == currentUser.BranchId, cancellationToken);
        if (setMenu is null)
            return Result<string>.Failure("Böyle bir menü bulunamadı.");

        StockImage? stockImage = await db.StockImages.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.StockImageId && s.IsActive && !s.IsDeleted, cancellationToken);
        if (stockImage is null)
            return Result<string>.Failure("Böyle bir hazır görsel bulunamadı.");

        string url = $"{storageOptions.Value.CdnBaseUrl.TrimEnd('/')}/{stockImage.StorageKey}";
        string previousKey = setMenu.ImageUrl;
        if (previousKey == stockImage.StorageKey)
            return Result<string>.Success(url);

        setMenu.UpdateImage(stockImage.StorageKey);
        await db.AddSetMenuAuditLogAsync(currentUser, setMenu, "SetMenuStockImageSelected",
            $"{setMenu.Name} menüsüne hazır görsel seçti ({stockImage.Title}).", AuditLogSeverity.Info, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        // Yüklemedeki gibi: menünün kendi eski dosyası silinir; eski görsel de hazır görselse dokunulmaz.
        await imageStorage.DeleteReplacedImageAsync(previousKey, cancellationToken);

        return Result<string>.Success(url);
    }
}
