using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Common;

public enum WaiterPermission
{
    TakeOrders,
    TakePayment,
    CancelAndDiscount,
    TransferAndReserve
}

// Garsonun bölge kapsamı ve yetkileri, mutfak kullanıcısının menü kategorileri. Her istekte veritabanından okunur ki
// yöneticinin yaptığı değişiklik token yenilenmesini beklemeden geçerli olsun.
// Owner/Admin/Cashier için kısıt yoktur.
public sealed class StaffAccess
{
    public const string RegionDeniedMessage = "Bu masa size atanan bölgelerin dışında.";
    public const string CategoryDeniedMessage = "Bu ürün size atanan kategorilerin dışında.";

    public static readonly StaffAccess Unrestricted = new(null, null, isWaiter: false, true, true, true, true);

    private readonly HashSet<Guid>? _regionIds;
    private readonly HashSet<Guid>? _categoryIds;
    private readonly bool _isWaiter;
    private readonly bool _canTakeOrders;
    private readonly bool _canTakePayment;
    private readonly bool _canCancelAndDiscount;
    private readonly bool _canTransferAndReserve;

    private StaffAccess(HashSet<Guid>? regionIds, HashSet<Guid>? categoryIds, bool isWaiter, bool canTakeOrders, bool canTakePayment, bool canCancelAndDiscount, bool canTransferAndReserve)
    {
        _regionIds = regionIds;
        _categoryIds = categoryIds;
        _isWaiter = isWaiter;
        _canTakeOrders = canTakeOrders;
        _canTakePayment = canTakePayment;
        _canCancelAndDiscount = canCancelAndDiscount;
        _canTransferAndReserve = canTransferAndReserve;
    }

    // null = tüm bölgeler.
    public IReadOnlyCollection<Guid>? RegionIds => _regionIds;

    public bool CanAccessRegion(Guid regionId) => _regionIds is null || _regionIds.Contains(regionId);

    // Mutfak kullanıcısının kategorileri; null = tüm kategoriler (mutfak dışındaki rollerde her zaman null).
    public IReadOnlyCollection<Guid>? CategoryIds => _categoryIds;

    public bool CanAccessCategory(Guid categoryId) => _categoryIds is null || _categoryIds.Contains(categoryId);

    public bool Has(WaiterPermission permission) => !_isWaiter || permission switch
    {
        WaiterPermission.TakeOrders => _canTakeOrders,
        WaiterPermission.TakePayment => _canTakePayment,
        WaiterPermission.CancelAndDiscount => _canCancelAndDiscount,
        WaiterPermission.TransferAndReserve => _canTransferAndReserve,
        _ => false
    };

    // Yetki yoksa kullanıcıya gösterilecek mesaj, varsa null.
    public string? Check(WaiterPermission permission) => Has(permission) ? null : DeniedMessage(permission);

    public static string DeniedMessage(WaiterPermission permission) => permission switch
    {
        WaiterPermission.TakeOrders => "Masa açma ve sipariş alma yetkiniz yok. Yöneticinizden yetki isteyin.",
        WaiterPermission.TakePayment => "Hesap alma (ödeme) yetkiniz yok. Yöneticinizden yetki isteyin.",
        WaiterPermission.CancelAndDiscount => "İptal ve indirim yetkiniz yok. Yöneticinizden yetki isteyin.",
        WaiterPermission.TransferAndReserve => "Masa taşıma ve rezervasyon yetkiniz yok. Yöneticinizden yetki isteyin.",
        _ => "Bu işlem için yetkiniz yok."
    };

    // Bölgeler yalnızca garsonda, kategoriler yalnızca mutfakta geçerlidir.
    public static StaffAccess From(UserBranch membership, bool isWaiter, bool isKitchen) => new(
        !isWaiter || membership.RegionIds.Count == 0 ? null : membership.RegionIds.ToHashSet(),
        !isKitchen || membership.CategoryIds.Count == 0 ? null : membership.CategoryIds.ToHashSet(),
        isWaiter,
        membership.CanTakeOrders,
        membership.CanTakePayment,
        membership.CanCancelAndDiscount,
        membership.CanTransferAndReserve);

    // Üyelik bulunamazsa (silinmiş/taşınmış kullanıcı) hiçbir masaya ve ürüne erişemez.
    public static StaffAccess Denied(bool isWaiter) => new([], [], isWaiter, false, false, false, false);
}

public static class StaffAccessExtensions
{
    // Kısıtı veritabanından okunan roller: garson (bölge + yetki) ve mutfak (kategori).
    public static bool IsScopedRole(string role) => role is "Waiter" or "Kitchen";

    public static async Task<StaffAccess> GetStaffAccessAsync(
        this IAppDbContext db, ICurrentUserService currentUser, CancellationToken cancellationToken)
    {
        if (!IsScopedRole(currentUser.Role))
            return StaffAccess.Unrestricted;

        bool isWaiter = currentUser.Role == "Waiter";
        bool isKitchen = currentUser.Role == "Kitchen";
        UserBranch? membership = await db.UserBranches
            .AsNoTracking()
            .FirstOrDefaultAsync(ub => ub.UserId == currentUser.UserId && ub.BranchId == currentUser.BranchId && !ub.IsDeleted, cancellationToken);

        return membership is null ? StaffAccess.Denied(isWaiter) : StaffAccess.From(membership, isWaiter, isKitchen);
    }

    // Masaya dokunan garson işlemlerinin ortak kontrolü: önce yetki (verildiyse), sonra masanın bölgesi.
    // Sorun yoksa null, varsa kullanıcıya gösterilecek mesaj döner.
    public static async Task<string?> CheckTableAccessAsync(
        this IAppDbContext db, ICurrentUserService currentUser, Guid tableId, WaiterPermission? permission, CancellationToken cancellationToken)
    {
        StaffAccess access = await db.GetStaffAccessAsync(currentUser, cancellationToken);
        return await db.CheckTableAccessAsync(access, tableId, permission, cancellationToken);
    }

    public static async Task<string?> CheckTableAccessAsync(
        this IAppDbContext db, StaffAccess access, Guid tableId, WaiterPermission? permission, CancellationToken cancellationToken)
    {
        if (permission.HasValue && access.Check(permission.Value) is { } denied)
            return denied;

        if (access.RegionIds is null)
            return null;

        Guid? regionId = await db.Tables.AsNoTracking()
            .Where(t => t.Id == tableId)
            .Select(t => (Guid?)t.RegionId)
            .FirstOrDefaultAsync(cancellationToken);

        return regionId.HasValue && access.CanAccessRegion(regionId.Value) ? null : StaffAccess.RegionDeniedMessage;
    }

    public static IQueryable<Table> InStaffRegions(this IQueryable<Table> query, StaffAccess access)
    {
        if (access.RegionIds is null) return query;
        List<Guid> ids = access.RegionIds.ToList();
        return query.Where(t => ids.Contains(t.RegionId));
    }

    public static IQueryable<Order> InStaffRegions(this IQueryable<Order> query, StaffAccess access)
    {
        if (access.RegionIds is null) return query;
        List<Guid> ids = access.RegionIds.ToList();
        return query.Where(o => ids.Contains(o.Table.RegionId));
    }

    public static IQueryable<OrderRequest> InStaffRegions(this IQueryable<OrderRequest> query, StaffAccess access)
    {
        if (access.RegionIds is null) return query;
        List<Guid> ids = access.RegionIds.ToList();
        return query.Where(r => ids.Contains(r.Table.RegionId));
    }

    public static IQueryable<Reservation> InStaffRegions(this IQueryable<Reservation> query, StaffAccess access)
    {
        if (access.RegionIds is null) return query;
        List<Guid> ids = access.RegionIds.ToList();
        return query.Where(r => ids.Contains(r.Table.RegionId));
    }

    // Mutfak kullanıcısının kategorileri dışındaki ürünü değiştirmesini engeller. Sorun yoksa null döner.
    public static async Task<string?> CheckOrderItemCategoryAsync(
        this IAppDbContext db, StaffAccess access, Guid orderItemId, CancellationToken cancellationToken)
    {
        if (access.CategoryIds is null)
            return null;

        Guid? categoryId = await db.OrderItems.AsNoTracking()
            .Where(i => i.Id == orderItemId)
            .Select(i => (Guid?)i.Product.CategoryId)
            .FirstOrDefaultAsync(cancellationToken);

        return categoryId.HasValue && access.CanAccessCategory(categoryId.Value) ? null : StaffAccess.CategoryDeniedMessage;
    }
}
