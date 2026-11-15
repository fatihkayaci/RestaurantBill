using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.SetMenus;

/// <summary>
/// Aktif şubenin menüleri (pasifler dahil; ekran IsActive'e göre süzer). IncludeCost yalnızca Admin/Owner ucunda
/// açılır: ürün maliyetleri ve varsayılan seçeneklerle tahmini menü maliyeti eklenir.
/// </summary>
public class GetSetMenusQuery : IRequest<Result<List<SetMenuDto>>>
{
    public bool IncludeCost { get; init; }
}

public class GetSetMenusQueryHandler(IAppDbContext db, ICurrentUserService currentUser, IOptions<BunnyStorageOptions> storageOptions)
    : IRequestHandler<GetSetMenusQuery, Result<List<SetMenuDto>>>
{
    public async Task<Result<List<SetMenuDto>>> Handle(GetSetMenusQuery request, CancellationToken cancellationToken)
    {
        Guid branchId = currentUser.BranchId;
        if (branchId == Guid.Empty)
            return Result<List<SetMenuDto>>.Failure("Geçersiz şube bilgisi.");

        List<SetMenu> setMenus = await db.SetMenus
            .AsNoTracking()
            .Include(s => s.Category)
            .Include(s => s.Slots).ThenInclude(slot => slot.Options).ThenInclude(o => o.Product)
            .Where(s => s.BranchId == branchId)
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .ToListAsync(cancellationToken);

        string cdnBaseUrl = storageOptions.Value.CdnBaseUrl.TrimEnd('/');
        return Result<List<SetMenuDto>>.Success(setMenus.Select(s => ToDto(s, request.IncludeCost, cdnBaseUrl)).ToList());
    }

    private static SetMenuDto ToDto(SetMenu s, bool includeCost, string cdnBaseUrl) => new()
    {
        Id = s.Id,
        Name = s.Name,
        Description = s.Description,
        Price = s.Price,
        ListPrice = s.GetListPrice(),
        DiscountType = s.DiscountType,
        DiscountValue = s.DiscountValue,
        ImageUrl = string.IsNullOrWhiteSpace(s.ImageUrl) ? string.Empty : $"{cdnBaseUrl}/{s.ImageUrl}",
        IsActive = s.IsActive,
        SortOrder = s.SortOrder,
        CategoryId = s.CategoryId,
        CategoryName = s.Category?.Name,
        EstimatedCost = includeCost ? s.GetEstimatedCost() : null,
        Slots = s.Slots
            .OrderBy(slot => slot.SortOrder)
            .Select(slot => new SetMenuSlotDto
            {
                Id = slot.Id,
                Name = slot.Name,
                CategoryId = slot.CategoryId,
                SortOrder = slot.SortOrder,
                IsFixed = slot.IsFixed,
                Options = slot.Options
                    .Select(o => new SetMenuSlotOptionDto
                    {
                        ProductId = o.ProductId,
                        ProductName = o.Product.Name,
                        ProductPrice = o.Product.Price,
                        DiscountType = o.DiscountType,
                        DiscountValue = o.DiscountValue,
                        Price = o.GetPrice(),
                        Surcharge = o.Surcharge,
                        IsDefault = o.IsDefault,
                        IsProductActive = o.Product.IsActive,
                        Cost = includeCost ? o.Product.Cost : null
                    })
                    .ToList()
            })
            .ToList()
    };
}
