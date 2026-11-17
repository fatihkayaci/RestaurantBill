using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.DataManagement;

/// <summary>Bir şubede silinecek gruplar. <see cref="CutoffUtc"/> yalnızca geçmiş gruplarına uygulanır (null: hepsi).</summary>
internal sealed class DeletionPlan(Branch branch, IEnumerable<string> groups, DateTime? cutoffUtc)
{
    public Branch Branch { get; } = branch;
    public Guid BranchId => Branch.Id;
    public IReadOnlySet<string> Groups { get; } = groups.ToHashSet();
    public DateTime? CutoffUtc { get; } = cutoffUtc;
    public bool Has(string group) => Groups.Contains(group);
}

/// <summary>Silme sonrasında CDN'den kaldırılacak dosyalar ve hesabı kontrol edilecek kullanıcılar.</summary>
internal sealed class DeletionOutcome
{
    public List<string> FileKeys { get; } = [];
    public HashSet<Guid> StaffUserIds { get; } = [];
}

/// <summary>
/// "Seçerek sil"in kuralları: hangi satırlar silinir, kaç tane, ve neden silinemez.
///
/// Yabancı anahtarlar: OrderItem → Product ve Order → Table veritabanında CASCADE'dir; yani ürün ya da masa silinince
/// adisyon kalemleri ve adisyonlar sessizce giderdi. OrderItem ürünün adını kopyalamaz (yalnızca fiyat ve KDV), bu yüzden
/// ürünü silinen bir kalem anlamını yitirir. Kural: menü ya da masalar, onları kullanan satış/rezervasyon/istek kaydı
/// kalacaksa silinmez ve önizleme bunu açıkça söyler. Aynı istekte o geçmiş de (tarih süzgeci olmadan) seçilmişse silinir.
/// Ödeme kalemleri (PaymentLineItem) ve paket sipariş satırları ürün adını kendileri tutar, ürün silinince etkilenmez.
/// </summary>
internal sealed class DataDeletionEngine(IAppDbContext db)
{
    // ── Kapsam sorguları ──────────────────────────────────────────────────────────────────────────────

    private IQueryable<Order> Orders(DeletionPlan p)
    {
        Guid b = p.BranchId; DateTime? c = p.CutoffUtc;
        return db.Orders.Where(o => o.BranchId == b && (c == null || o.CreatedAt < c));
    }

    private IQueryable<OrderItem> OrderItems(DeletionPlan p)
    {
        Guid b = p.BranchId; DateTime? c = p.CutoffUtc;
        return db.OrderItems.Where(oi => oi.Order.BranchId == b && (c == null || oi.Order.CreatedAt < c));
    }

    private IQueryable<Payment> Payments(DeletionPlan p)
    {
        Guid b = p.BranchId; DateTime? c = p.CutoffUtc;
        return db.Payments.Where(x => x.Order.BranchId == b && (c == null || x.Order.CreatedAt < c));
    }

    private IQueryable<PaymentLineItem> PaymentLines(DeletionPlan p)
    {
        Guid b = p.BranchId; DateTime? c = p.CutoffUtc;
        return db.PaymentLineItems.Where(l => l.Payment.Order.BranchId == b && (c == null || l.Payment.Order.CreatedAt < c));
    }

    private IQueryable<CashTransaction> CashTransactions(DeletionPlan p)
    {
        Guid b = p.BranchId; DateTime? c = p.CutoffUtc;
        return db.CashTransactions.Where(t => t.CashRegister.BranchId == b && (c == null || t.CreatedAt < c));
    }

    private IQueryable<Shift> Shifts(DeletionPlan p)
    {
        Guid b = p.BranchId; DateTime? c = p.CutoffUtc;
        return db.Shifts.Where(s => s.BranchId == b && (c == null || s.OpenedAt < c));
    }

    private IQueryable<Reservation> Reservations(DeletionPlan p)
    {
        Guid b = p.BranchId; DateTime? c = p.CutoffUtc;
        return db.Reservations.Where(r => r.Table.Region.BranchId == b && (c == null || r.ReservationTime < c));
    }

    private IQueryable<OrderRequest> PreOrdersOfReservations(DeletionPlan p)
    {
        IQueryable<Guid> reservationIds = Reservations(p).Select(r => r.Id);
        return db.OrderRequests.Where(r => r.ReservationId != null && reservationIds.Contains(r.ReservationId.Value));
    }

    private IQueryable<OrderRequest> OrderRequests(DeletionPlan p)
    {
        Guid b = p.BranchId;
        return db.OrderRequests.Where(r => r.Table.Region.BranchId == b);
    }

    private IQueryable<DeliveryOrder> DeliveryOrders(DeletionPlan p)
    {
        Guid b = p.BranchId; DateTime? c = p.CutoffUtc;
        return db.DeliveryOrders.Where(d => d.BranchId == b && (c == null || d.CreatedAt < c));
    }

    private IQueryable<CustomerPhoneVerification> PhoneVerifications(DeletionPlan p)
    {
        Guid b = p.BranchId; DateTime? c = p.CutoffUtc;
        return db.CustomerPhoneVerifications.Where(v => v.BranchId == b && (c == null || v.CreatedAt < c));
    }

    private IQueryable<BlockedPhone> BlockedPhones(DeletionPlan p)
    {
        Guid b = p.BranchId; DateTime? c = p.CutoffUtc;
        return db.BlockedPhones.Where(x => x.BranchId == b && (c == null || x.CreatedAt < c));
    }

    private IQueryable<ContactMessage> Messages(DeletionPlan p)
    {
        Guid b = p.BranchId; DateTime? c = p.CutoffUtc;
        return db.ContactMessages.Where(m => m.BranchId == b && (c == null || m.CreatedAt < c));
    }

    private IQueryable<AuditLog> AuditLogs(DeletionPlan p)
    {
        Guid b = p.BranchId; DateTime? c = p.CutoffUtc;
        return db.AuditLogs.Where(a => a.BranchId == b && (c == null || a.CreatedAt < c));
    }

    private IQueryable<Category> Categories(Guid b) => db.Categories.Where(x => x.BranchId == b);
    private IQueryable<Product> Products(Guid b) => db.Products.Where(x => x.Category.BranchId == b);
    private IQueryable<SetMenu> SetMenus(Guid b) => db.SetMenus.Where(x => x.BranchId == b);
    private IQueryable<Region> Regions(Guid b) => db.Regions.Where(x => x.BranchId == b);
    private IQueryable<Table> Tables(Guid b) => db.Tables.Where(x => x.Region.BranchId == b);

    // Sahip UserBranch ile bağlı değildir (Company.OwnerUserId); yine de Owner rolündeki bir satır asla silinmez.
    private IQueryable<UserBranch> Staff(Guid b) => db.UserBranches.Where(ub => ub.BranchId == b && ub.Role != UserRole.Owner);

    // ── Önizleme ─────────────────────────────────────────────────────────────────────────────────────

    public async Task<List<DeletionGroupDto>> CountAsync(DeletionPlan p, CancellationToken ct)
    {
        List<DeletionGroupDto> groups = [];
        Guid b = p.BranchId;

        foreach (string group in DataGroups.All.Where(p.Has))
        {
            List<CountLineDto> lines = group switch
            {
                DataGroups.Sales =>
                [
                    new("Adisyon", await Orders(p).CountAsync(ct)),
                    new("Adisyon kalemi", await OrderItems(p).CountAsync(ct)),
                    new("Ödeme", await Payments(p).CountAsync(ct)),
                    new("Kasa hareketi", await CashTransactions(p).CountAsync(ct)),
                    new("Vardiya", await Shifts(p).CountAsync(ct)),
                ],
                DataGroups.Reservations =>
                [
                    new("Rezervasyon", await Reservations(p).CountAsync(ct)),
                    new("Ön sipariş", await PreOrdersOfReservations(p).CountAsync(ct)),
                ],
                DataGroups.Delivery =>
                [
                    new("Paket sipariş", await DeliveryOrders(p).CountAsync(ct)),
                    new("Telefon doğrulaması", await PhoneVerifications(p).CountAsync(ct)),
                    new("Engellenen numara", await BlockedPhones(p).CountAsync(ct)),
                ],
                DataGroups.OrderRequests => [new("Sipariş isteği", await OrderRequests(p).CountAsync(ct))],
                DataGroups.Messages => [new("Mesaj", await Messages(p).CountAsync(ct))],
                DataGroups.Menu =>
                [
                    new("Kategori", await Categories(b).CountAsync(ct)),
                    new("Ürün", await Products(b).CountAsync(ct)),
                    new("Set menü", await SetMenus(b).CountAsync(ct)),
                ],
                DataGroups.Tables =>
                [
                    new("Bölüm", await Regions(b).CountAsync(ct)),
                    new("Masa", await Tables(b).CountAsync(ct)),
                ],
                DataGroups.Site =>
                [
                    new("Fotoğraf", p.Branch.SiteImageKeysInUse().Count),
                    new("Taslak", p.Branch.SiteDraft is null ? 0 : 1),
                ],
                DataGroups.Staff => [new("Çalışan", await Staff(b).CountAsync(ct))],
                DataGroups.AuditLogs => [new("Kayıt", await AuditLogs(p).CountAsync(ct))],
                _ => []
            };
            groups.Add(new DeletionGroupDto
            {
                Key = group,
                Label = DataGroups.Label(group),
                Lines = lines,
                DateFiltered = p.CutoffUtc is not null && DataGroups.History.Contains(group),
            });
        }

        return groups;
    }

    /// <summary>Bu plan uygulanamazsa nedenleri (şube adıyla). Boş liste: silinebilir.</summary>
    public async Task<List<string>> FindBlockersAsync(DeletionPlan p, CancellationToken ct)
    {
        List<string> blockers = [];
        string n = p.Branch.BranchName;
        Guid b = p.BranchId;
        DateTime? c = p.CutoffUtc;

        if (p.Has(DataGroups.Sales))
        {
            if (await Orders(p).AnyAsync(o => o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled, ct))
                blockers.Add($"{n}: açık adisyon var. Satış geçmişini silmeden önce adisyonları kapatın.");
            if (await Shifts(p).AnyAsync(s => s.Status == ShiftStatus.Open, ct))
                blockers.Add($"{n}: açık vardiya var. Önce vardiyayı kapatın.");
        }

        if (p.Has(DataGroups.Delivery) && await DeliveryOrders(p).AnyAsync(d => DeliveryScope.OpenStatuses.Contains(d.Status), ct))
            blockers.Add($"{n}: devam eden paket sipariş var. Önce tamamlayın ya da iptal edin.");

        bool salesAll = p.Has(DataGroups.Sales);
        bool requestsAll = p.Has(DataGroups.OrderRequests);
        bool reservationsSelected = p.Has(DataGroups.Reservations);
        IQueryable<Guid> deletedReservationIds = Reservations(p).Select(r => r.Id);

        if (p.Has(DataGroups.Menu))
        {
            IQueryable<Guid> productIds = Products(b).Select(x => x.Id);
            IQueryable<Guid> setMenuIds = SetMenus(b).Select(x => x.Id);

            IQueryable<OrderItem> usingMenu = db.OrderItems.Where(oi =>
                (oi.ProductId != null && productIds.Contains(oi.ProductId.Value))
                || (oi.SetMenuId != null && setMenuIds.Contains(oi.SetMenuId.Value)));
            if (salesAll)
                usingMenu = usingMenu.Where(oi => !(oi.Order.BranchId == b && (c == null || oi.Order.CreatedAt < c)));
            int used = await usingMenu.CountAsync(ct);
            if (used > 0)
                blockers.Add($"{n}: menüdeki ürünler {used} adisyon kaleminde geçiyor. Menüyü silmek için satış geçmişini de tarih seçmeden (tümü) seçin.");

            if (!requestsAll)
            {
                IQueryable<OrderRequestItem> requested = db.OrderRequestItems.Where(ri => productIds.Contains(ri.ProductId));
                if (reservationsSelected)
                    requested = requested.Where(ri => ri.OrderRequest.ReservationId == null || !deletedReservationIds.Contains(ri.OrderRequest.ReservationId.Value));
                if (await requested.AnyAsync(ct))
                    blockers.Add($"{n}: menüdeki ürünler masa sipariş isteklerinde geçiyor. Menüyü silmek için masa sipariş isteklerini de seçin.");
            }
        }

        if (p.Has(DataGroups.Tables))
        {
            IQueryable<Guid> tableIds = Tables(b).Select(t => t.Id);

            IQueryable<Order> ordersOnTables = db.Orders.Where(o => o.TableId != null && tableIds.Contains(o.TableId.Value));
            if (salesAll)
                ordersOnTables = ordersOnTables.Where(o => !(o.BranchId == b && (c == null || o.CreatedAt < c)));
            if (await ordersOnTables.AnyAsync(ct))
                blockers.Add($"{n}: masalarda adisyon geçmişi var. Masaları silmek için satış geçmişini de tarih seçmeden (tümü) seçin.");

            IQueryable<Reservation> reservationsOnTables = db.Reservations.Where(r => tableIds.Contains(r.TableId));
            if (reservationsSelected)
                reservationsOnTables = reservationsOnTables.Where(r => !deletedReservationIds.Contains(r.Id));
            if (await reservationsOnTables.AnyAsync(ct))
                blockers.Add($"{n}: masalarda rezervasyon var. Masaları silmek için rezervasyonları da tarih seçmeden (tümü) seçin.");

            if (!requestsAll)
            {
                IQueryable<OrderRequest> requestsOnTables = db.OrderRequests.Where(r => tableIds.Contains(r.TableId));
                if (reservationsSelected)
                    requestsOnTables = requestsOnTables.Where(r => r.ReservationId == null || !deletedReservationIds.Contains(r.ReservationId.Value));
                if (await requestsOnTables.AnyAsync(ct))
                    blockers.Add($"{n}: masalarda sipariş isteği var. Masaları silmek için masa sipariş isteklerini de seçin.");
            }
        }

        return blockers;
    }

    // ── Silme ────────────────────────────────────────────────────────────────────────────────────────

    /// <summary>Planı uygular (çağıran bir işlem içinde çalıştırır). Sıra: önce çocuklar, sonra ebeveynler.</summary>
    public async Task ExecuteAsync(DeletionPlan p, DeletionOutcome outcome, CancellationToken ct)
    {
        Guid b = p.BranchId;

        if (p.Has(DataGroups.Sales))
        {
            await DataStore.DeleteAsync(db, db.PaymentLineItems, _ => PaymentLines(p), ct);
            await DataStore.DeleteAsync(db, db.Payments, _ => Payments(p), ct);
            await DataStore.DeleteAsync(db, db.OrderItems, _ => OrderItems(p), ct);
            await DataStore.DeleteAsync(db, db.Orders, _ => Orders(p), ct);
            await DataStore.DeleteAsync(db, db.CashTransactions, _ => CashTransactions(p), ct);
            await DataStore.DeleteAsync(db, db.Shifts, _ => Shifts(p), ct);
        }

        if (p.Has(DataGroups.Reservations))
        {
            IQueryable<Guid> preOrderIds = PreOrdersOfReservations(p).Select(r => r.Id);
            await DataStore.DeleteAsync(db, db.OrderRequestItems, s => s.Where(i => preOrderIds.Contains(i.OrderRequestId)), ct);
            await DataStore.DeleteAsync(db, db.OrderRequests, _ => PreOrdersOfReservations(p), ct);
            await DataStore.DeleteAsync(db, db.Reservations, _ => Reservations(p), ct);
        }

        if (p.Has(DataGroups.OrderRequests))
        {
            await DataStore.DeleteAsync(db, db.OrderRequestItems, s => s.Where(i => i.OrderRequest.Table.Region.BranchId == b), ct);
            await DataStore.DeleteAsync(db, db.OrderRequests, _ => OrderRequests(p), ct);
        }

        if (p.Has(DataGroups.Delivery))
        {
            IQueryable<Guid> deliveryIds = DeliveryOrders(p).Select(d => d.Id);
            await DataStore.DeleteAsync(db, db.DeliveryOrderLines, s => s.Where(l => deliveryIds.Contains(l.DeliveryOrderId)), ct);
            await DataStore.DeleteAsync(db, db.DeliveryOrders, _ => DeliveryOrders(p), ct);
            await DataStore.DeleteAsync(db, db.CustomerPhoneVerifications, _ => PhoneVerifications(p), ct);
            await DataStore.DeleteAsync(db, db.BlockedPhones, _ => BlockedPhones(p), ct);
        }

        if (p.Has(DataGroups.Messages))
            await DataStore.DeleteAsync(db, db.ContactMessages, _ => Messages(p), ct);

        if (p.Has(DataGroups.Menu))
        {
            outcome.FileKeys.AddRange(await Products(b).Select(x => x.ImageUrl).Where(k => k != "").ToListAsync(ct));
            outcome.FileKeys.AddRange(await SetMenus(b).Select(x => x.ImageUrl).Where(k => k != "").ToListAsync(ct));

            await DataStore.DeleteAsync(db, db.SetMenuSlotOptions, s => s.Where(o => o.SetMenuSlot.SetMenu.BranchId == b), ct);
            await DataStore.DeleteAsync(db, db.SetMenuSlots, s => s.Where(x => x.SetMenu.BranchId == b), ct);
            await DataStore.DeleteAsync(db, db.SetMenus, _ => SetMenus(b), ct);
            await DataStore.DeleteAsync(db, db.Products, _ => Products(b), ct);
            await DataStore.DeleteAsync(db, db.Categories, _ => Categories(b), ct);
        }

        if (p.Has(DataGroups.Tables))
        {
            await DataStore.DeleteAsync(db, db.Tables, _ => Tables(b), ct);
            await DataStore.DeleteAsync(db, db.Regions, _ => Regions(b), ct);
        }

        // Çalışanların kategori/bölüm/masa kısıtları silinen kayıtları göstermesin (çalışanlar da siliniyorsa gerek yok).
        if ((p.Has(DataGroups.Menu) || p.Has(DataGroups.Tables)) && !p.Has(DataGroups.Staff))
        {
            List<UserBranch> staff = await db.UserBranches.Where(ub => ub.BranchId == b).ToListAsync(ct);
            foreach (UserBranch ub in staff)
            {
                if (p.Has(DataGroups.Menu)) ub.SetCategories([]);
                if (p.Has(DataGroups.Tables))
                {
                    ub.SetRegions([]);
                    ub.SetTableRestriction([], []);
                }
            }
        }

        if (p.Has(DataGroups.Site))
            outcome.FileKeys.AddRange(p.Branch.ResetSite());

        if (p.Has(DataGroups.Staff))
        {
            outcome.StaffUserIds.UnionWith(await Staff(b).Select(ub => ub.UserId).ToListAsync(ct));
            await DataStore.DeleteAsync(db, db.UserBranches, _ => Staff(b), ct);
            // Bu şubenin oturumları kapanır; kullanıcı başka yerde de çalışıyorsa orada devam eder.
            await DataStore.DeleteAsync(db, db.RefreshTokens,
                s => s.Where(rt => rt.BranchId == b && rt.Role != UserRole.Owner), ct);
        }

        if (p.Has(DataGroups.AuditLogs))
            await DataStore.DeleteAsync(db, db.AuditLogs, _ => AuditLogs(p), ct);
    }

    /// <summary>
    /// Şube bağı kalmayan ve hiçbir şirketin sahibi olmayan kullanıcıları (oturumları ve doğrulama kodlarıyla) siler.
    /// Başka bir şubede/şirkette hâlâ çalışan kullanıcıya dokunulmaz.
    /// </summary>
    public async Task DeleteOrphanUsersAsync(IReadOnlyCollection<Guid> userIds, CancellationToken ct)
    {
        if (userIds.Count == 0)
            return;

        List<Guid> ids = [.. userIds];
        List<Guid> orphans = await db.Users
            .Where(u => ids.Contains(u.Id)
                && !db.UserBranches.Any(ub => ub.UserId == u.Id)
                && !db.Companies.Any(c => c.OwnerUserId == u.Id))
            .Select(u => u.Id)
            .ToListAsync(ct);
        if (orphans.Count == 0)
            return;

        await DataStore.DeleteAsync(db, db.RefreshTokens, s => s.Where(rt => orphans.Contains(rt.UserId)), ct);
        await DataStore.DeleteAsync(db, db.VerificationCodes, s => s.Where(v => orphans.Contains(v.UserId)), ct);
        await DataStore.DeleteAsync(db, db.Users, s => s.Where(u => orphans.Contains(u.Id)), ct);
    }
}
