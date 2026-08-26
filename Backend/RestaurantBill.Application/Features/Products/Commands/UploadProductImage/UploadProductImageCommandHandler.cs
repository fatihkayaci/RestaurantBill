using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.UploadProductImage
{
    public class UploadProductImageCommandHandler : IRequestHandler<UploadProductImageCommand, Result<string>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;
        private readonly IImageStorageService _imageStorage;
        private readonly BunnyStorageOptions _storageOptions;

        public UploadProductImageCommandHandler(
            IAppDbContext db,
            ICurrentUserService currentUser,
            IImageStorageService imageStorage,
            IOptions<BunnyStorageOptions> storageOptions)
        {
            _db = db;
            _currentUser = currentUser;
            _imageStorage = imageStorage;
            _storageOptions = storageOptions.Value;
        }

        public async Task<Result<string>> Handle(UploadProductImageCommand request, CancellationToken cancellationToken)
        {
            Product? product = await _db.Products
                .Include(p => p.Category)
                .FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken);
            if (product is null)
                return Result<string>.Failure("Böyle bir ürün bulunamadı.");

            if (product.Category.BranchId != _currentUser.BranchId)
                return Result<string>.Failure("Bu ürüne erişim yetkiniz yok.");

            string newKey;
            try
            {
                newKey = await _imageStorage.UploadAsync(request.Content, _currentUser.BranchId, cancellationToken);
            }
            catch
            {
                return Result<string>.Failure("Görsel dosyası işlenemedi. Lütfen geçerli bir resim yükleyin.");
            }

            string previousKey = product.ImageUrl;
            product.UpdateImage(newKey);

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                _currentUser.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.Product,
                AuditLogSeverity.Info,
                "ProductImageUpdated",
                $"{actor?.FullName} {product.Name} ürününün görselini güncelledi.",
                nameof(Product),
                product.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);

            if (!string.IsNullOrWhiteSpace(previousKey))
            {
                try
                {
                    await _imageStorage.DeleteAsync(previousKey, cancellationToken);
                }
                catch
                {
                    // Best-effort cleanup: the new image is already saved, don't fail the request over an orphaned old file.
                }
            }

            return Result<string>.Success($"{_storageOptions.CdnBaseUrl.TrimEnd('/')}/{newKey}");
        }
    }
}
