using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Products;

public static class ProductSortOrder
{
    /// <summary>Kategorinin sonuna gelecek sıra: şu anki en büyük sıradan bir fazla (boş kategoride 0).</summary>
    public static async Task<int> EndOfCategoryAsync(IAppDbContext db, Guid categoryId, CancellationToken cancellationToken)
    {
        int? last = await db.Products
            .Where(p => p.CategoryId == categoryId)
            .MaxAsync(p => (int?)p.SortOrder, cancellationToken);
        return (last ?? -1) + 1;
    }
}
