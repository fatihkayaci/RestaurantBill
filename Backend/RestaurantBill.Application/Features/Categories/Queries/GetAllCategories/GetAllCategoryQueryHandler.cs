using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;
namespace RestaurantBill.Application.Features.Categories.Queries.GetAllCategories
{
    public class GetAllCategoryQueryHandler : IRequestHandler<GetAllCategoryQuery, Result<List<CategoryDto>>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetAllCategoryQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<List<CategoryDto>>> Handle(GetAllCategoryQuery request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;
            if (restaurantId == Guid.Empty) return Result<List<CategoryDto>>.Failure("Geçersiz şube bilgisi.");

            var categories = await _db.Categories
                .AsNoTracking()
                .Where(c => c.BranchId == restaurantId)
                .OrderBy(c => c.Name)
                .Select(c => new CategoryDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    TaxRate = c.TaxRate,
                    EffectiveTaxRate = c.TaxRate ?? c.Branch.TaxRate
                })
                .ToListAsync(cancellationToken);

            return Result<List<CategoryDto>>.Success(categories);
        }
    }
}
