using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.UpdateProduct
{
    public class UpdateProductCommandHandler : IRequestHandler<UpdateProductCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public UpdateProductCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(UpdateProductCommand request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUser, cancellationToken);

            Product? product = await _db.Products
                .InBranches(branchIds).FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);
            if (product is null)
                return Result.Failure("Böyle bir ürün bulunamadı.");

            Guid productBranchId = await _db.Categories
                .Where(c => c.Id == product.CategoryId)
                .Select(c => c.BranchId)
                .FirstAsync(cancellationToken);
            bool categoryInSameBranch = await _db.Categories
                .AnyAsync(c => c.Id == request.CategoryId && c.BranchId == productBranchId, cancellationToken);
            if (!categoryInSameBranch)
                return Result.Failure("Böyle bir kategori bulunamadı.");

            bool priceChanged = product.Price != request.Price;
            product.Update(request.Name, request.Price, request.IsActive, request.CategoryId);

            // Menü fiyatları ürün fiyatlarından hesaplanır: bu ürünü içeren menüler yeni fiyatla yeniden hesaplanır.
            if (priceChanged)
            {
                List<SetMenu> setMenus = await _db.SetMenus
                    .Include(s => s.Slots).ThenInclude(slot => slot.Options).ThenInclude(o => o.Product)
                    .Where(s => s.Slots.Any(slot => slot.Options.Any(o => o.ProductId == product.Id)))
                    .ToListAsync(cancellationToken);
                foreach (SetMenu setMenu in setMenus)
                    setMenu.RecalculatePrice();
            }
            if (request.Cost is not null)
                product.SetCost(request.Cost.Value);
            product.UpdateSiteDetails(request.Description, request.IsFeatured);
            product.SetPrepMinutes(request.PrepMinutes);
            product.SetTaxRate(request.TaxRate);

            if (!string.IsNullOrWhiteSpace(request.ImageUrl))
                product.UpdateImage(request.ImageUrl);

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                _currentUser.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.Product,
                AuditLogSeverity.Info,
                "ProductUpdated",
                $"{actor?.FullName} {product.Name} ürününü güncelledi.",
                nameof(Product),
                product.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
