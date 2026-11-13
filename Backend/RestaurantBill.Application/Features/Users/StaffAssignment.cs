using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Users;

// Kullanıcı formundan gelen bölge, kategori ve garson yetkisi alanları. null alan = değiştirme (yeni kullanıcıda varsayılan).
public interface IStaffAssignmentRequest
{
    List<Guid>? RegionIds { get; }
    List<Guid>? CategoryIds { get; }
    bool? CanTakeOrders { get; }
    bool? CanTakePayment { get; }
    bool? CanCancelAndDiscount { get; }
    bool? CanTransferAndReserve { get; }
}

public static class StaffAssignment
{
    public static bool UsesRegions(UserRole role) => role is UserRole.Waiter;
    public static bool UsesCategories(UserRole role) => role is UserRole.Kitchen;

    // Bölgeler ve yetkiler yalnızca garsonda, kategoriler yalnızca mutfakta saklanır; başka role geçen kullanıcının
    // atamaları temizlenir ki eski rolüne döndüğünde eski kısıt sessizce geri gelmesin.
    public static async Task<string?> ApplyAsync(
        IAppDbContext db, UserBranch membership, UserRole role, IStaffAssignmentRequest request, CancellationToken cancellationToken)
    {
        if (!UsesRegions(role))
        {
            membership.SetRegions([]);
        }
        else if (request.RegionIds is not null)
        {
            List<Guid> regionIds = request.RegionIds.Where(id => id != Guid.Empty).Distinct().ToList();
            if (regionIds.Count > 0)
            {
                int found = await db.Regions
                    .CountAsync(r => regionIds.Contains(r.Id) && r.BranchId == membership.BranchId && !r.IsDeleted, cancellationToken);
                if (found != regionIds.Count)
                    return "Seçilen bölgelerden biri bu şubeye ait değil.";
            }
            membership.SetRegions(regionIds);
        }

        if (!UsesCategories(role))
        {
            membership.SetCategories([]);
        }
        else if (request.CategoryIds is not null)
        {
            List<Guid> categoryIds = request.CategoryIds.Where(id => id != Guid.Empty).Distinct().ToList();
            if (categoryIds.Count > 0)
            {
                int found = await db.Categories
                    .CountAsync(c => categoryIds.Contains(c.Id) && c.BranchId == membership.BranchId && !c.IsDeleted, cancellationToken);
                if (found != categoryIds.Count)
                    return "Seçilen kategorilerden biri bu şubeye ait değil.";
            }
            membership.SetCategories(categoryIds);
        }

        if (role == UserRole.Waiter)
        {
            membership.SetWaiterPermissions(
                request.CanTakeOrders ?? membership.CanTakeOrders,
                request.CanTakePayment ?? membership.CanTakePayment,
                request.CanCancelAndDiscount ?? membership.CanCancelAndDiscount,
                request.CanTransferAndReserve ?? membership.CanTransferAndReserve);
        }

        return null;
    }
}
