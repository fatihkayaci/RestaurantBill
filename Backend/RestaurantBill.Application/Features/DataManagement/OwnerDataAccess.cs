using System.Globalization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.DataManagement;

/// <summary>Silme/sıfırlama/kapatma isteklerinin ortak onayı: restoran adı ve sahibin şifresi.</summary>
public interface IOwnerConfirmation
{
    string RestaurantName { get; }
    string Password { get; }
}

// Bu sayfadaki her uç yalnızca şirketin sahibine açıktır (Admin değil). Owner token'ı şube ya da "Tümü" kapsamında olabilir;
// şirket her iki durumda da CompanyId claim'inden ve OwnerUserId eşleşmesinden çözülür.
public static class OwnerDataAccess
{
    public const string OwnerOnlyMessage = "Bu işlemi yalnızca restoran sahibi yapabilir.";
    public const string CompanyNotFoundMessage = "Şirket bulunamadı.";
    public const string WrongNameMessage = "Restoran adı eşleşmiyor. Adı tam olarak yazın.";
    public const string WrongPasswordMessage = "Şifre hatalı.";
    public const string NoBranchMessage = "En az bir şube seçin.";
    public const string UnknownBranchMessage = "Seçilen şubelerden biri bulunamadı.";

    private static readonly CultureInfo Turkish = CultureInfo.GetCultureInfo("tr-TR");

    public static async Task<(Company? Company, string? Error)> ResolveCompanyAsync(IAppDbContext db, ICurrentUserService currentUser,
        CancellationToken cancellationToken, bool tracking = false)
    {
        if (currentUser.Role != "Owner")
            return (null, OwnerOnlyMessage);

        IQueryable<Company> query = tracking ? db.Companies : db.Companies.AsNoTracking();
        Company? company = await query.FirstOrDefaultAsync(
            c => c.Id == currentUser.CompanyId && c.OwnerUserId == currentUser.UserId && !c.IsDeleted, cancellationToken);
        return company is null ? (null, CompanyNotFoundMessage) : (company, null);
    }

    /// <summary>Seçilen şubeler şirkete ait olmalı. Şirketin tek şubesi varsa seçim adımı gizlidir; boş liste o şubedir.</summary>
    public static async Task<(List<Branch> Branches, string? Error)> ResolveBranchesAsync(IAppDbContext db, Company company,
        IReadOnlyCollection<Guid>? branchIds, CancellationToken cancellationToken, bool tracking = false)
    {
        IQueryable<Branch> query = (tracking ? db.Branches : db.Branches.AsNoTracking())
            .Where(b => b.CompanyId == company.Id && !b.IsDeleted);
        List<Branch> all = await query.OrderBy(b => b.CreatedAt).ToListAsync(cancellationToken);

        List<Guid> wanted = (branchIds ?? []).Where(id => id != Guid.Empty).Distinct().ToList();
        if (wanted.Count == 0)
            return all.Count == 1 ? (all, null) : ([], NoBranchMessage);

        List<Branch> selected = all.Where(b => wanted.Contains(b.Id)).ToList();
        return selected.Count != wanted.Count ? ([], UnknownBranchMessage) : (selected, null);
    }

    public static bool NameMatches(string? typed, string companyName)
        => string.Compare(Normalize(typed), Normalize(companyName), Turkish, CompareOptions.IgnoreCase) == 0;

    private static string Normalize(string? value)
        => string.Join(' ', (value ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

    /// <summary>Adı ve şifreyi doğrular; hata yoksa sahibin kullanıcı kaydını döner.</summary>
    public static async Task<(User? Owner, string? Error)> ConfirmAsync(IAppDbContext db, IPasswordHasher<User> passwordHasher,
        Company company, IOwnerConfirmation confirmation, CancellationToken cancellationToken)
    {
        if (!NameMatches(confirmation.RestaurantName, company.Name))
            return (null, WrongNameMessage);

        User? owner = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == company.OwnerUserId && !u.IsDeleted, cancellationToken);
        if (owner is null || string.IsNullOrEmpty(confirmation.Password)
            || passwordHasher.VerifyHashedPassword(owner, owner.PasswordHash, confirmation.Password) == PasswordVerificationResult.Failed)
            return (null, WrongPasswordMessage);

        return (owner, null);
    }

    /// <summary>"2026-01-01" → o günün şubenin yerel saatiyle başlangıcı (UTC). Boş: tarih süzgeci yok.</summary>
    public static bool TryParseCutoff(string? olderThan, out DateOnly? day)
    {
        day = null;
        if (string.IsNullOrWhiteSpace(olderThan))
            return true;
        if (!DateOnly.TryParseExact(olderThan.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly parsed))
            return false;
        day = parsed;
        return true;
    }

    public static DateTime? CutoffUtc(DateOnly? day, string timeZoneId)
    {
        if (day is not DateOnly d)
            return null;
        DateTime local = DateTime.SpecifyKind(d.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(local, CustomerSite.CustomerSiteScope.ZoneOf(timeZoneId));
    }

    public static IReadOnlyList<string> CleanKeys(IEnumerable<string>? keys, IReadOnlyList<string> allowed)
        => (keys ?? []).Where(allowed.Contains).Distinct().OrderBy(k => allowed.ToList().IndexOf(k)).ToList();
}
