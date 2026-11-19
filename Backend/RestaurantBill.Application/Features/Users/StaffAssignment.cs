using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Users;

// Kullanıcı formundan gelen bölge, kategori, garson ve kasiyer yetkisi alanları. null alan = değiştirme (yeni kullanıcıda varsayılan).
public interface IStaffAssignmentRequest
{
    List<Guid>? RegionIds { get; }
    List<Guid>? RestrictedRegionIds { get; }
    List<Guid>? TableIds { get; }
    List<Guid>? CategoryIds { get; }
    bool? CanTakeOrders { get; }
    bool? CanTakePayment { get; }
    bool? CanCancelAndDiscount { get; }
    bool? CanTransferAndReserve { get; }
    bool? CanApplyDiscount { get; }
    int? MaxDiscountPercent { get; }
    bool? CanTransferTables { get; }
}

public static class StaffAssignment
{
    public static bool UsesRegions(UserRole role) => role is UserRole.Waiter or UserRole.Cashier;
    public static bool UsesCategories(UserRole role) => role is UserRole.Kitchen;

    // Bölgeler garsonda ve kasiyerde, garson yetkileri yalnızca garsonda, kategoriler yalnızca mutfakta saklanır; başka
    // role geçen kullanıcının atamaları temizlenir ki eski rolüne döndüğünde eski kısıt sessizce geri gelmesin.
    // Garson ↔ kasiyer geçişinde bölge ve masa seçimi korunur (ikisi de aynı kapsamı kullanır).
    public static async Task<string?> ApplyAsync(
        IAppDbContext db, UserBranch membership, UserRole role, IStaffAssignmentRequest request, CancellationToken cancellationToken)
    {
        if (!UsesRegions(role))
        {
            membership.SetRegions([]);
            membership.SetTableRestriction([], []);
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

        if (UsesRegions(role))
            await ApplyTableRestrictionAsync(
                db, membership, request.RestrictedRegionIds ?? membership.RestrictedRegionIds, request.TableIds ?? membership.TableIds, cancellationToken);

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

        if (role == UserRole.Cashier)
        {
            int maxDiscountPercent = request.MaxDiscountPercent ?? membership.MaxDiscountPercent;
            if (maxDiscountPercent is < 1 or > 100)
                return "İndirim sınırı %1 ile %100 arasında olmalıdır.";

            membership.SetCashierPermissions(
                request.CanApplyDiscount ?? membership.CanApplyDiscount,
                maxDiscountPercent,
                request.CanTransferTables ?? membership.CanTransferTables);
        }

        return null;
    }

    // Masa seçimi bölgelerden sonra uygulanır; uymayan değerler hata vermeden atılır:
    //   - masa masa bakılan bölge, garsonun bölgelerinden biri değilse (bölge kaldırıldıysa) listeden çıkar;
    //   - masa, şubenin ve masa masa bakılan bir bölgenin masası değilse atılır. Böylece bölgesi kaldırılan ya da
    //     "Tüm masalar"a döndürülen bölgenin masaları kendiliğinden temizlenir.
    // Seçili masası olmayan masa masa bölge kabul edilir (garson orada hiçbir masaya bakmaz). Bölge seçilmemişse
    // (tüm bölgeler) masa seçimi anlamsızdır, temizlenir. Alanlar gönderilmese de mevcut seçim yeniden süzülür.
    private static async Task ApplyTableRestrictionAsync(
        IAppDbContext db, UserBranch membership, List<Guid> requestedRestrictedRegionIds, List<Guid> requestedTableIds,
        CancellationToken cancellationToken)
    {
        List<Guid> restrictedRegionIds = requestedRestrictedRegionIds.Where(membership.RegionIds.Contains).Distinct().ToList();
        List<Guid> tableIds = requestedTableIds.Where(id => id != Guid.Empty).Distinct().ToList();
        if (restrictedRegionIds.Count == 0 || tableIds.Count == 0)
        {
            membership.SetTableRestriction(restrictedRegionIds, []);
            return;
        }

        List<Guid> validTableIds = await db.Tables
            .Where(t => tableIds.Contains(t.Id) && restrictedRegionIds.Contains(t.RegionId) && t.Region.BranchId == membership.BranchId)
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);
        // İstekteki sırayı koru.
        membership.SetTableRestriction(restrictedRegionIds, tableIds.Where(validTableIds.Contains));
    }
}
