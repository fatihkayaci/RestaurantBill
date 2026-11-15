using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.SetProductStock;

/// <summary>
/// "Tükendi" anahtarı: ürün aktif kalır (masada satılabilir) ama online siparişte seçilemez. Kasiyer ve mutfak da
/// açıp kapatabilir; kategori atanmış mutfak yalnızca kendi kategorilerindeki ürünleri.
/// </summary>
public class SetProductStockCommand : IRequest<Result>, IInvalidatesCache
{
    public Guid Id { get; set; }
    public bool IsOutOfStock { get; set; }

    public string[] CacheKeysToInvalidate => ["products:all"];
}

public class SetProductStockCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<SetProductStockCommand, Result>
{
    public async Task<Result> Handle(SetProductStockCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await db.GetAccessibleBranchIdsAsync(currentUser, cancellationToken);

        Product? product = await db.Products
            .Include(p => p.Category)
            .InBranches(branchIds)
            .FirstOrDefaultAsync(p => p.Id == request.Id && !p.IsDeleted, cancellationToken);
        if (product is null)
            return Result.Failure("Böyle bir ürün bulunamadı.");

        StaffAccess access = await db.GetStaffAccessAsync(currentUser, cancellationToken);
        if (!access.CanAccessCategory(product.CategoryId))
            return Result.Failure(StaffAccess.CategoryDeniedMessage);

        if (product.IsOutOfStock == request.IsOutOfStock)
            return Result.Success();

        product.SetOutOfStock(request.IsOutOfStock);

        User? actor = await db.Users.FirstOrDefaultAsync(u => u.Id == currentUser.UserId, cancellationToken);
        db.AuditLogs.Add(AuditLog.Create(
            product.Category.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.Product,
            AuditLogSeverity.Info,
            request.IsOutOfStock ? "ProductOutOfStock" : "ProductBackInStock",
            request.IsOutOfStock
                ? $"{actor?.FullName} {product.Name} ürününü tükendi olarak işaretledi."
                : $"{actor?.FullName} {product.Name} ürününü yeniden satışa açtı.",
            nameof(Product),
            product.Id));

        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
