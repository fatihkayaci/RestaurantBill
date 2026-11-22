using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Common;

public enum WaiterPermission
{
    TakeOrders,
    TakePayment,
    CancelAndDiscount,
    TransferAndReserve,
    // Masada QR'dan siparişi kilitleme/açma. Diğer yetkilerden farklı olarak kasiyer, mutfak ve kurye bunu hiç
    // yapamaz; yalnız Owner/Admin ve bu yetkisi verilmiş garson (bkz. CanLockQrOrdering).
    LockQr
}

public enum CashierPermission
{
    ApplyDiscount,
    TransferTables
}

// Garsonun ve kasiyerin bölge/masa kapsamı, garsonun yetkileri, mutfak kullanıcısının menü kategorileri, kasiyerin
// yetkileri. Her istekte veritabanından okunur ki yöneticinin yaptığı değişiklik token yenilenmesini beklemeden geçerli olsun.
// Owner/Admin için kısıt yoktur.
public sealed class StaffAccess
{
    public const string RegionDeniedMessage = "Bu masa size atanan bölge ve masaların dışında.";
    public const string CategoryDeniedMessage = "Bu ürün size atanan kategorilerin dışında.";
    public const string DeliveryDeniedMessage = "Paket siparişler garson ekranından yönetilemez.";
    public const string QrLockDeniedMessage = "QR siparişini kilitleme yetkiniz yok. Yöneticinizden yetki isteyin.";
    public const string CashierDeliveryDeniedMessage = "Paket siparişleri görme yetkiniz yok. Yöneticinizden yetki isteyin.";

    public static readonly StaffAccess Unrestricted = new(null, null, isWaiter: false, true, true, true, true, true, cashier: null);

    // Kasiyer yetkileri; kasiyer olmayan rollerde null.
    private sealed record CashierRights(bool CanApplyDiscount, int MaxDiscountPercent, bool CanTransferTables, bool CanViewDelivery);

    private readonly WaiterScope? _waiterScope;
    private readonly HashSet<Guid>? _categoryIds;
    private readonly bool _isWaiter;
    private readonly bool _canTakeOrders;
    private readonly bool _canTakePayment;
    private readonly bool _canCancelAndDiscount;
    private readonly bool _canTransferAndReserve;
    private readonly bool _canLockQr;
    private readonly CashierRights? _cashier;

    private StaffAccess(WaiterScope? waiterScope, HashSet<Guid>? categoryIds, bool isWaiter, bool canTakeOrders, bool canTakePayment, bool canCancelAndDiscount, bool canTransferAndReserve,
        bool canLockQr, CashierRights? cashier)
    {
        _waiterScope = waiterScope;
        _categoryIds = categoryIds;
        _isWaiter = isWaiter;
        _canTakeOrders = canTakeOrders;
        _canTakePayment = canTakePayment;
        _canCancelAndDiscount = canCancelAndDiscount;
        _canTransferAndReserve = canTransferAndReserve;
        _canLockQr = canLockQr;
        _cashier = cashier;
    }

    // Garsonun ya da kasiyerin baktığı bölgeler ve masalar; null = tüm masalar (bölgesi boş garson/kasiyer ve diğer
    // roller). Adı tarihsel: kapsam önce yalnızca garsondaydı, kasiyer de aynı kuralla kısıtlanır.
    public WaiterScope? WaiterScope => _waiterScope;

    // Garson yalnızca masa siparişleriyle çalışır; paket siparişler kapsamı ne olursa olsun dışındadır.
    // Kasiyerde bu kural yok: kapsamı kısıtlı kasiyer de paket siparişleri görür ve tahsil eder.
    public bool IsWaiter => _isWaiter;

    // Paket (masasız) siparişler: garson hiç göremez; kasiyer yöneticinin işaretlediği "Paket siparişler" yetkisine göre
    // (bölge/masa kapsamından bağımsız); yöneticiler görür.
    public bool CanAccessDelivery => !_isWaiter && (_cashier is null || _cashier.CanViewDelivery);

    // Paket siparişe erişemeyen kullanıcıya gösterilecek mesaj, erişebiliyorsa null.
    public string? DeliveryDeniedReason => CanAccessDelivery ? null : _isWaiter ? DeliveryDeniedMessage : CashierDeliveryDeniedMessage;

    public bool CanAccessTable(Guid tableId, Guid regionId) => _waiterScope is null || _waiterScope.Covers(tableId, regionId);

    // Mutfak kullanıcısının kategorileri; null = tüm kategoriler (mutfak dışındaki rollerde her zaman null).
    public IReadOnlyCollection<Guid>? CategoryIds => _categoryIds;

    public bool CanAccessCategory(Guid categoryId) => _categoryIds is null || _categoryIds.Contains(categoryId);

    public bool Has(WaiterPermission permission) => !_isWaiter || permission switch
    {
        WaiterPermission.TakeOrders => _canTakeOrders,
        WaiterPermission.TakePayment => _canTakePayment,
        WaiterPermission.CancelAndDiscount => _canCancelAndDiscount,
        WaiterPermission.TransferAndReserve => _canTransferAndReserve,
        WaiterPermission.LockQr => _canLockQr,
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
        WaiterPermission.LockQr => QrLockDeniedMessage,
        _ => "Bu işlem için yetkiniz yok."
    };

    public bool Has(CashierPermission permission) => _cashier is null || permission switch
    {
        CashierPermission.ApplyDiscount => _cashier.CanApplyDiscount,
        CashierPermission.TransferTables => _cashier.CanTransferTables,
        _ => false
    };

    // Yetki yoksa kullanıcıya gösterilecek mesaj, varsa null.
    public string? Check(CashierPermission permission) => Has(permission) ? null : DeniedMessage(permission);

    public static string DeniedMessage(CashierPermission permission) => permission switch
    {
        CashierPermission.ApplyDiscount => "İndirim ve ikram yetkiniz yok. Yöneticinizden yetki isteyin.",
        CashierPermission.TransferTables => "Masa taşıma ve birleştirme yetkiniz yok. Yöneticinizden yetki isteyin.",
        _ => "Bu işlem için yetkiniz yok."
    };

    // Kasiyerin bir ödemede uygulayabileceği en yüksek indirim yüzdesi; diğer rollerde sınır yok (%100).
    public int MaxDiscountPercent => _cashier?.MaxDiscountPercent ?? 100;

    public static string DiscountLimitMessage(int maxDiscountPercent) =>
        $"En fazla %{maxDiscountPercent} indirim uygulayabilirsiniz. Daha yüksek indirim için yöneticinizden yetki isteyin.";

    // Bölge/masa kapsamı garsonda ve kasiyerde, kategoriler yalnızca mutfakta, kasiyer yetkileri yalnızca kasiyerde geçerlidir.
    // waiterScope garson ve kasiyer için GetWaiterScopeAsync ile üyelikten kurulur; diğer rollerde null verilir.
    public static StaffAccess From(UserBranch membership, WaiterScope? waiterScope, bool isWaiter, bool isKitchen, bool isCashier) => new(
        isWaiter || isCashier ? waiterScope : null,
        !isKitchen || membership.CategoryIds.Count == 0 ? null : membership.CategoryIds.ToHashSet(),
        isWaiter,
        membership.CanTakeOrders,
        membership.CanTakePayment,
        membership.CanCancelAndDiscount,
        membership.CanTransferAndReserve,
        membership.CanLockQr,
        isCashier ? new CashierRights(membership.CanApplyDiscount, membership.MaxDiscountPercent, membership.CanTransferTables, membership.CanViewDelivery) : null);

    // Üyelik bulunamazsa (silinmiş/taşınmış kullanıcı) hiçbir masaya ve ürüne erişemez.
    public static StaffAccess Denied(bool isWaiter, bool isCashier) =>
        new(WaiterScope.Empty, [], isWaiter, false, false, false, false, false, isCashier ? new CashierRights(false, 100, false, false) : null);
}

public static class StaffAccessExtensions
{
    // Kısıtı veritabanından okunan roller: garson (bölge/masa + yetki), mutfak (kategori) ve kasiyer (bölge/masa + yetki).
    // Kurye kısıtlı rol değildir: sipariş/masa uçlarına rolü yetmez, kendi uçlarında yalnızca kendi siparişlerini görür.
    public static bool IsScopedRole(string role) => role is "Waiter" or "Kitchen" or "Cashier";

    public static async Task<StaffAccess> GetStaffAccessAsync(
        this IAppDbContext db, ICurrentUserService currentUser, CancellationToken cancellationToken)
    {
        if (!IsScopedRole(currentUser.Role))
            return StaffAccess.Unrestricted;

        bool isWaiter = currentUser.Role == "Waiter";
        bool isKitchen = currentUser.Role == "Kitchen";
        bool isCashier = currentUser.Role == "Cashier";
        UserBranch? membership = await db.UserBranches
            .AsNoTracking()
            .FirstOrDefaultAsync(ub => ub.UserId == currentUser.UserId && ub.BranchId == currentUser.BranchId && !ub.IsDeleted, cancellationToken);

        if (membership is null)
            return StaffAccess.Denied(isWaiter, isCashier);

        WaiterScope? waiterScope = isWaiter || isCashier
            ? await db.GetWaiterScopeAsync(membership.RegionIds, membership.RestrictedRegionIds, membership.TableIds, cancellationToken)
            : null;
        return StaffAccess.From(membership, waiterScope, isWaiter, isKitchen, isCashier);
    }

    // Masaya dokunan garson/kasiyer işlemlerinin ortak kontrolü: önce yetki (verildiyse), sonra masanın kullanıcının
    // kapsamında olması.
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

        if (access.WaiterScope is null)
            return null;

        Guid? regionId = await db.Tables.AsNoTracking()
            .Where(t => t.Id == tableId)
            .Select(t => (Guid?)t.RegionId)
            .FirstOrDefaultAsync(cancellationToken);

        return regionId.HasValue && access.CanAccessTable(tableId, regionId.Value) ? null : StaffAccess.RegionDeniedMessage;
    }

    // Siparişe dokunan işlemlerin ortak kontrolü. Masa siparişinde CheckTableAccessAsync; masasız (paket) siparişte
    // yetki kontrolü yapılır; garson ve paket yetkisi olmayan kasiyer erişemez.
    public static async Task<string?> CheckOrderAccessAsync(
        this IAppDbContext db, ICurrentUserService currentUser, Order order, WaiterPermission? permission, CancellationToken cancellationToken)
    {
        StaffAccess access = await db.GetStaffAccessAsync(currentUser, cancellationToken);
        return await db.CheckOrderAccessAsync(access, order, permission, cancellationToken);
    }

    public static async Task<string?> CheckOrderAccessAsync(
        this IAppDbContext db, StaffAccess access, Order order, WaiterPermission? permission, CancellationToken cancellationToken)
    {
        if (order.TableId is Guid tableId)
            return await db.CheckTableAccessAsync(access, tableId, permission, cancellationToken);

        if (permission.HasValue && access.Check(permission.Value) is { } denied)
            return denied;

        return access.DeliveryDeniedReason;
    }

    // Aşağıdaki süzgeçler garsonun/kasiyerin kapsamını uygular: tamamına bakılan bölgelerin masaları + seçili masalar.

    public static IQueryable<Table> InStaffRegions(this IQueryable<Table> query, StaffAccess access)
    {
        if (access.WaiterScope is not { } scope) return query;
        List<Guid> regionIds = scope.WholeRegionIds.ToList();
        List<Guid> tableIds = scope.TableIds.ToList();
        return query.Where(t => regionIds.Contains(t.RegionId) || tableIds.Contains(t.Id));
    }

    // Garsona paket (masasız) sipariş hiç gelmez; kapsamı boş (tüm masalar) olan garsona da. Kasiyer paket siparişleri
    // "Paket siparişler" yetkisi varsa görür (CanAccessDelivery).
    public static IQueryable<Order> InStaffRegions(this IQueryable<Order> query, StaffAccess access)
    {
        if (!access.CanAccessDelivery)
            query = query.Where(o => o.TableId != null);
        if (access.WaiterScope is not { } scope) return query;
        List<Guid> regionIds = scope.WholeRegionIds.ToList();
        List<Guid> tableIds = scope.TableIds.ToList();
        // Paket siparişler buraya yalnızca yetkili kullanıcıda gelir (yukarıda süzülür); kapsam yalnızca masa siparişlerini daraltır.
        return query.Where(o => o.TableId == null || regionIds.Contains(o.Table!.RegionId) || tableIds.Contains(o.TableId!.Value));
    }

    public static IQueryable<OrderRequest> InStaffRegions(this IQueryable<OrderRequest> query, StaffAccess access)
    {
        if (access.WaiterScope is not { } scope) return query;
        List<Guid> regionIds = scope.WholeRegionIds.ToList();
        List<Guid> tableIds = scope.TableIds.ToList();
        return query.Where(r => regionIds.Contains(r.Table.RegionId) || tableIds.Contains(r.TableId));
    }

    public static IQueryable<Reservation> InStaffRegions(this IQueryable<Reservation> query, StaffAccess access)
    {
        if (access.WaiterScope is not { } scope) return query;
        List<Guid> regionIds = scope.WholeRegionIds.ToList();
        List<Guid> tableIds = scope.TableIds.ToList();
        return query.Where(r => regionIds.Contains(r.Table.RegionId) || tableIds.Contains(r.TableId));
    }

    // Mutfak kullanıcısının kategorileri dışındaki ürünü değiştirmesini engeller. Sorun yoksa null döner.
    public static async Task<string?> CheckOrderItemCategoryAsync(
        this IAppDbContext db, StaffAccess access, Guid orderItemId, CancellationToken cancellationToken)
    {
        if (access.CategoryIds is null)
            return null;

        Guid? categoryId = await db.OrderItems.AsNoTracking()
            .Where(i => i.Id == orderItemId)
            .Select(i => (Guid?)i.Product!.CategoryId)
            .FirstOrDefaultAsync(cancellationToken);

        return categoryId.HasValue && access.CanAccessCategory(categoryId.Value) ? null : StaffAccess.CategoryDeniedMessage;
    }
}
