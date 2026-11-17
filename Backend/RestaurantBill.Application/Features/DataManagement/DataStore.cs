using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.DataManagement;

// Toplu silme ve işlem (transaction) yardımcıları. Postgres'te satırlar belleğe alınmadan tek DELETE ile silinir ve hepsi
// tek işlemde olur (biri hata verirse hiçbiri silinmez). InMemory (testler) toplu silme ve işlem bilmez; orada satırlar
// okunup silinir. Silme sırası her zaman önce çocuklar sonra ebeveynlerdir: veritabanının cascade kuralına güvenilmez.
internal static class DataStore
{
    public static async Task<int> DeleteAsync<T>(IAppDbContext db, DbSet<T> set, Func<IQueryable<T>, IQueryable<T>> filter,
        CancellationToken cancellationToken) where T : class
    {
        IQueryable<T> query = filter(set);
        if (db.Database.IsRelational())
            return await query.ExecuteDeleteAsync(cancellationToken);

        List<T> rows = await query.ToListAsync(cancellationToken);
        set.RemoveRange(rows);
        await db.SaveChangesAsync(cancellationToken);
        return rows.Count;
    }

    /// <summary>İşi tek işlemde çalıştırır, izlenen değişiklikleri kaydeder ve onaylar. İş hata verirse hiçbir şey kalıcı olmaz.</summary>
    public static async Task RunInTransactionAsync(IAppDbContext db, Func<Task> work, CancellationToken cancellationToken)
    {
        if (!db.Database.IsRelational())
        {
            await work();
            await db.SaveChangesAsync(cancellationToken);
            return;
        }

        await using IDbContextTransaction transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await work();
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }
}
