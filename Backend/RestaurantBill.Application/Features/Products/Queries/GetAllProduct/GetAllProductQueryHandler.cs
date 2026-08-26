using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;
namespace RestaurantBill.Application.Features.Products.Queries.GetAllProduct
{
    public class GetAllProductQueryHandler : IRequestHandler<GetAllProductQuery, Result<List<ProductDto>>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;
        private readonly BunnyStorageOptions _storageOptions;
        public GetAllProductQueryHandler(IAppDbContext db, ICurrentUserService currentUser, IOptions<BunnyStorageOptions> storageOptions)
        {
            _db = db;
            _currentUser = currentUser;
            _storageOptions = storageOptions.Value;
        }

        public async Task<Result<List<ProductDto>>> Handle(GetAllProductQuery request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;
            if (restaurantId == Guid.Empty)
                return Result<List<ProductDto>>.Failure("Geçersiz şube bilgisi.");

            var products = await _db.Products
                .AsNoTracking()
                .Where(p => p.Category.BranchId == restaurantId)
                .OrderBy(p => p.Name)
                .Select(p => new ProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Price = p.Price,
                    IsActive = p.IsActive,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category.Name,
                    ImageUrl = p.ImageUrl
                })
                .ToListAsync(cancellationToken);

            string cdnBaseUrl = _storageOptions.CdnBaseUrl.TrimEnd('/');
            foreach (var product in products)
            {
                if (!string.IsNullOrWhiteSpace(product.ImageUrl))
                    product.ImageUrl = $"{cdnBaseUrl}/{product.ImageUrl}";
            }

            return Result<List<ProductDto>>.Success(products);
        }
    }
}
