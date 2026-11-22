using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Features.Categories;
using RestaurantBill.Domain.Entities;
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

            var rows = await _db.Categories
                .AsNoTracking()
                .Where(c => c.BranchId == restaurantId)
                .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
                .Select(c => new
                {
                    Dto = new CategoryDto
                    {
                        Id = c.Id,
                        Name = c.Name,
                        TaxRate = c.TaxRate,
                        EffectiveTaxRate = c.TaxRate ?? c.Branch.TaxRate,
                        MenuDisplay = c.MenuDisplay,
                        AvailableDays = c.AvailableDays,
                    },
                    c.AvailableFrom,
                    c.AvailableUntil,
                    c.Branch.TimeZoneId
                })
                .ToListAsync(cancellationToken);

            // Servis penceresi şubenin yerel saatiyle değerlendirilir (garson/kasa ekranında uyarı; sipariş engellenmez).
            DateTime utcNow = DateTime.UtcNow;
            List<CategoryDto> categories = rows.Select(r =>
            {
                CategoryDto dto = r.Dto;
                dto.AvailableFrom = r.AvailableFrom is TimeOnly f ? TurkishTime.Format(f) : null;
                dto.AvailableUntil = r.AvailableUntil is TimeOnly u ? TurkishTime.Format(u) : null;
                DateTime local = CategoryAvailability.LocalNow(r.TimeZoneId, utcNow);
                dto.AvailableNow = Category.IsAvailableAt(r.Dto.AvailableDays, r.AvailableFrom, r.AvailableUntil, local);
                dto.AvailabilityLabel = Category.AvailabilityLabel(r.Dto.AvailableDays, r.AvailableFrom, r.AvailableUntil);
                return dto;
            }).ToList();

            return Result<List<CategoryDto>>.Success(categories);
        }
    }
}
