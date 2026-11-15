using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.SetProductStockImage
{
    public class SetProductStockImageCommandHandler(
        IAppDbContext db,
        ICurrentUserService currentUser,
        IImageStorageService imageStorage,
        IOptions<BunnyStorageOptions> storageOptions)
        : IRequestHandler<SetProductStockImageCommand, Result<string>>
    {
        public async Task<Result<string>> Handle(SetProductStockImageCommand request, CancellationToken cancellationToken)
        {
            // Görsel yüklemeyle aynı kural: yalnızca aktif şubenin ürünü.
            List<Guid> branchIds = await db.GetAccessibleBranchIdsAsync(currentUser, cancellationToken);
            Product? product = await db.Products
                .Include(p => p.Category)
                .InBranches(branchIds).FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken);
            if (product is null)
                return Result<string>.Failure("Böyle bir ürün bulunamadı.");

            if (product.Category.BranchId != currentUser.BranchId)
                return Result<string>.Failure("Bu ürüne erişim yetkiniz yok.");

            StockImage? stockImage = await db.StockImages.AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == request.StockImageId && s.IsActive && !s.IsDeleted, cancellationToken);
            if (stockImage is null)
                return Result<string>.Failure("Böyle bir hazır görsel bulunamadı.");

            string url = $"{storageOptions.Value.CdnBaseUrl.TrimEnd('/')}/{stockImage.StorageKey}";
            string previousKey = product.ImageUrl;
            if (previousKey == stockImage.StorageKey)
                return Result<string>.Success(url);

            product.UpdateImage(stockImage.StorageKey);

            User? actor = await db.Users.FirstOrDefaultAsync(u => u.Id == currentUser.UserId, cancellationToken);
            db.AuditLogs.Add(AuditLog.Create(
                currentUser.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.Product,
                AuditLogSeverity.Info,
                "ProductStockImageSelected",
                $"{actor?.FullName} {product.Name} ürününe hazır görsel seçti ({stockImage.Title}).",
                nameof(Product),
                product.Id));

            await db.SaveChangesAsync(cancellationToken);

            // Yüklemedeki gibi: restoranın kendi eski dosyası silinir; eski görsel de hazır görselse dokunulmaz.
            await imageStorage.DeleteReplacedImageAsync(previousKey, cancellationToken);

            return Result<string>.Success(url);
        }
    }
}
