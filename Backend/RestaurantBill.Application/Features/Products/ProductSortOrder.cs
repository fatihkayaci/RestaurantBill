using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Products;

public static class ProductSortOrder
{
    /// <summary>Kategorinin en başına gelecek sıra: şu anki en küçük sıradan bir eksik (boş kategoride 0).</summary>
    public static async Task<int> TopOfCategoryAsync(IAppDbContext db, Guid categoryId, CancellationToken cancellationToken)
    {
        int? first = await db.Products
            .Where(p => p.CategoryId == categoryId)
            .MinAsync(p => (int?)p.SortOrder, cancellationToken);
        return (first ?? 1) - 1;
    }
}
