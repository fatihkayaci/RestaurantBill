using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.DataManagement;

/// <summary>
/// Kapatılan şirketin bekleme süresi dolunca: bütün şubeleri ve verileri, yalnızca bu şirkete bağlı kullanıcılar ve
/// şirketin/şubelerin kendi CDN klasörleri silinir. shared/ asla silinmez. Slug boşa çıkar (şirket satırı gider).
///
/// Güvenli tekrar: her şirket tek işlemde silinir. İşlem yarıda kalırsa hiçbir şey silinmemiş olur ve sonraki turda yeniden
/// denenir; şirket satırının silinmesi "bitti" işaretidir. Dosyalar işlem onaylandıktan sonra silinir; silinemeyen dosya
/// loglanır, veri silme geri alınmaz. Denetim kaydı da silindiği için olay uygulama loguna yazılır.
/// </summary>
public class CompanyPurger(IAppDbContext db, IImageStorageService imageStorage, ILogger<CompanyPurger> logger) : ICompanyPurger
{
    public async Task<int> PurgeDueAsync(DateTime nowUtc, CancellationToken cancellationToken)
    {
        List<Guid> due = await db.Companies.AsNoTracking()
            .Where(c => c.ClosedAt != null && c.DeletionScheduledAt != null && c.DeletionScheduledAt <= nowUtc)
            .OrderBy(c => c.DeletionScheduledAt)
            .Select(c => c.Id)
            .ToListAsync(cancellationToken);

        int purged = 0;
        foreach (Guid companyId in due)
        {
            try
            {
                if (await PurgeAsync(companyId, nowUtc, cancellationToken))
                    purged++;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Şirket kalıcı silme başarısız (sonraki turda yeniden denenecek): {CompanyId}", companyId);
            }
        }
        return purged;
    }

    private async Task<bool> PurgeAsync(Guid companyId, DateTime nowUtc, CancellationToken ct)
    {
        Company? company = await db.Companies.AsNoTracking().FirstOrDefaultAsync(c => c.Id == companyId, ct);
        // Bu arada sahibi vazgeçtiyse ya da başka bir örnek sildiyse dokunma.
        if (company is null || !company.IsDueForDeletion(nowUtc))
            return false;

        List<Branch> branches = await db.Branches.AsNoTracking().Where(b => b.CompanyId == companyId).ToListAsync(ct);
        List<Guid> branchIds = branches.Select(b => b.Id).ToList();

        // Yüklemeler şube id'siyle, şirket kapsamındaki ("Tümü") sahibin yüklemeleri şirket id'siyle klasörlenir.
        List<string> folders = [.. branchIds.Append(companyId).SelectMany(StorageKeys.OwnFoldersOf)];
        List<string> keys = [.. branches.SelectMany(b => b.SiteImageKeysInUse())];

        List<Guid> staffUserIds = await db.UserBranches.Where(ub => branchIds.Contains(ub.BranchId)).Select(ub => ub.UserId).Distinct().ToListAsync(ct);
        List<Guid> userIds = [.. staffUserIds.Append(company.OwnerUserId).Distinct()];

        logger.LogWarning("Şirket kalıcı olarak siliniyor: {CompanyId} ({CompanyName}, slug {Slug}), {BranchCount} şube, kapatıldı {ClosedAt:o}. Klasörler: {Folders}",
            company.Id, company.Name, company.Slug, branches.Count, company.ClosedAt, string.Join(", ", folders));

        DataDeletionEngine engine = new(db);
        DeletionOutcome outcome = new();

        await DataStore.RunInTransactionAsync(db, async () =>
        {
            foreach (Branch branch in branches)
            {
                // Site grubu şube satırını değiştirir; şube zaten silineceği için atlanır (anahtarlar yukarıda alındı).
                await engine.ExecuteAsync(new DeletionPlan(branch, DataGroups.All.Where(g => g != DataGroups.Site), null), outcome, ct);
            }

            await DataStore.DeleteAsync(db, db.UserBranches, s => s.Where(ub => branchIds.Contains(ub.BranchId)), ct);
            await DataStore.DeleteAsync(db, db.DeliveryZones, s => s.Where(z => branchIds.Contains(z.BranchId)), ct);
            await DataStore.DeleteAsync(db, db.Memberships, s => s.Where(m => branchIds.Contains(m.BranchId)), ct);
            await DataStore.DeleteAsync(db, db.CashRegisters, s => s.Where(r => branchIds.Contains(r.BranchId)), ct);
            await DataStore.DeleteAsync(db, db.AuditLogs, s => s.Where(a => branchIds.Contains(a.BranchId)), ct);
            // "Tümü" kapsamındaki sahip oturumları BranchId olarak şirket id'sini taşır.
            await DataStore.DeleteAsync(db, db.RefreshTokens, s => s.Where(rt => branchIds.Contains(rt.BranchId) || rt.BranchId == companyId), ct);
            await DataStore.DeleteAsync(db, db.Branches, s => s.Where(b => b.CompanyId == companyId), ct);
            await DataStore.DeleteAsync(db, db.Companies, s => s.Where(c => c.Id == companyId), ct);

            await engine.DeleteOrphanUsersAsync(userIds, ct);
        }, ct);

        keys.AddRange(outcome.FileKeys);
        int fileFailures = await DataFiles.DeleteAsync(imageStorage, keys, folders, logger, ct);

        logger.LogWarning("Şirket kalıcı olarak silindi: {CompanyId} ({CompanyName}). Slug '{Slug}' artık boşta. Silinemeyen dosya/klasör: {Failures}.",
            company.Id, company.Name, company.Slug, fileFailures);
        return true;
    }
}
