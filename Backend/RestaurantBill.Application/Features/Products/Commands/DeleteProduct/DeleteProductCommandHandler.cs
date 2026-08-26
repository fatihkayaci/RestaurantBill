using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.DeleteProduct
{
    public class DeleteProductCommandHandler : IRequestHandler<DeleteProductCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;
        private readonly IImageStorageService _imageStorage;

        public DeleteProductCommandHandler(IAppDbContext db, ICurrentUserService currentUser, IImageStorageService imageStorage)
        {
            _db = db;
            _currentUser = currentUser;
            _imageStorage = imageStorage;
        }

        public async Task<Result> Handle(DeleteProductCommand request, CancellationToken cancellationToken)
        {
            Product? product = await _db.Products
                .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);
            if (product is null)
                return Result.Failure("Böyle bir ürün bulunamadı.");

            List<OrderItem> linkedOrderItems = await _db.OrderItems
                .Where(oi => oi.ProductId == request.Id)
                .ToListAsync(cancellationToken);
            product.EnsureCanBeDeleted(linkedOrderItems);

            _db.Products.Remove(product);

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                _currentUser.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.Product,
                AuditLogSeverity.Warning,
                "ProductDeleted",
                $"{actor?.FullName} {product.Name} ürününü sildi.",
                nameof(Product),
                product.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);

            if (!string.IsNullOrWhiteSpace(product.ImageUrl))
            {
                try
                {
                    await _imageStorage.DeleteAsync(product.ImageUrl, cancellationToken);
                }
                catch
                {
                    // Best-effort cleanup: product deletion has already succeeded, don't fail the request over a stale CDN file.
                }
            }

            return Result.Success();
        }
    }
}
