using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;
namespace RestaurantBill.Application.Features.Products.Queries.GetAllProductWithCost
{
    public class GetAllProductWithCostQueryHandler : IRequestHandler<GetAllProductWithCostQuery, Result<List<ProductWithCostDto>>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;
        private readonly BunnyStorageOptions _storageOptions;
        public GetAllProductWithCostQueryHandler(IAppDbContext db, ICurrentUserService currentUser, IOptions<BunnyStorageOptions> storageOptions)
        {
            _db = db;
            _currentUser = currentUser;
            _storageOptions = storageOptions.Value;
        }

        public async Task<Result<List<ProductWithCostDto>>> Handle(GetAllProductWithCostQuery request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;
            if (restaurantId == Guid.Empty)
                return Result<List<ProductWithCostDto>>.Failure("Geçersiz şube bilgisi.");

            var products = await _db.Products
                .AsNoTracking()
                .Where(p => p.Category.BranchId == restaurantId)
                .OrderBy(p => p.Category.SortOrder).ThenBy(p => p.Category.Name).ThenBy(p => p.SortOrder).ThenBy(p => p.Name)
                .Select(p => new ProductWithCostDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Price = p.Price,
                    Cost = p.Cost,
                    IsActive = p.IsActive,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category.Name,
                    ImageUrl = p.ImageUrl,
                    Description = p.Description,
                    IsFeatured = p.IsFeatured,
                    PrepMinutes = p.PrepMinutes,
                    TaxRate = p.TaxRate,
                    EffectiveTaxRate = p.TaxRate ?? p.Category.TaxRate ?? p.Category.Branch.TaxRate,
                    IsOutOfStock = p.IsOutOfStock
                })
                .ToListAsync(cancellationToken);

            string cdnBaseUrl = _storageOptions.CdnBaseUrl.TrimEnd('/');
            foreach (var product in products)
            {
                if (!string.IsNullOrWhiteSpace(product.ImageUrl))
                    product.ImageUrl = $"{cdnBaseUrl}/{product.ImageUrl}";
            }

            return Result<List<ProductWithCostDto>>.Success(products);
        }
    }
}
