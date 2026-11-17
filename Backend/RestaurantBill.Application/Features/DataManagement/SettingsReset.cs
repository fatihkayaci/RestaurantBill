using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.DataManagement;

// "Verileri sil → Sıfırla": seçilen şube ayarları yeni kayıt olmuş bir restoranın değerlerine döner. Satış, rezervasyon,
// menü gibi geçmiş veriye dokunulmaz. Giriş bilgileri, şirket/şube adı ve site adresi (slug) hiç değişmez.
// Varsayılanlar kayıt akışından (RegisterCommandHandler) gelir: ilk şube sahibin adı/telefonu/e-postasıyla, adressiz,
// KDV %10 açılır; rezervasyon/online sipariş/QR ayarları kaydedilmemiştir (null → domain varsayılanları).

public class ResetSelection
{
    public List<Guid> BranchIds { get; set; } = [];
    public List<string> Items { get; set; } = [];
}

internal static class ResetResolver
{
    public const string NoItemMessage = "En az bir ayar seçin.";

    public static async Task<(Company? Company, List<Branch> Branches, IReadOnlyList<string> Items, string? Error)> ResolveAsync(
        IAppDbContext db, ICurrentUserService currentUser, ResetSelection selection, bool tracking, CancellationToken ct)
    {
        (Company? company, string? error) = await OwnerDataAccess.ResolveCompanyAsync(db, currentUser, ct);
        if (company is null)
            return (null, [], [], error);

        IReadOnlyList<string> items = OwnerDataAccess.CleanKeys(selection.Items, ResetItems.All);
        if (items.Count == 0)
            return (company, [], [], NoItemMessage);

        (List<Branch> branches, string? branchError) = await OwnerDataAccess.ResolveBranchesAsync(db, company, selection.BranchIds, ct, tracking);
        return branchError is not null ? (company, [], [], branchError) : (company, branches, items, null);
    }

    public static ResetPreviewDto Preview(IEnumerable<Branch> branches, IReadOnlyList<string> items) => new()
    {
        Branches = branches.Select(b => new BranchResetPreviewDto
        {
            BranchId = b.Id,
            BranchName = b.BranchName,
            Items = items.Select(i => new ResetItemPreviewDto { Key = i, Label = ResetItems.Label(i), Description = ResetItems.Description(i) }).ToList(),
        }).ToList(),
    };

    /// <summary>Şubeye maddeleri uygular; silinecek site fotoğrafı anahtarlarını döner.</summary>
    public static async Task<List<string>> ApplyAsync(IAppDbContext db, Branch branch, IReadOnlyList<string> items, User owner, CancellationToken ct)
    {
        List<string> keys = [];
        foreach (string item in items)
        {
            switch (item)
            {
                case ResetItems.WorkingHours: branch.ResetWorkingHours(); break;
                case ResetItems.Site: keys.AddRange(branch.ResetSite()); break;
                case ResetItems.Reservations: branch.SetReservationSettings(null); break;
                case ResetItems.OnlineOrdering: branch.ResetOnlineOrdering(); break;
                case ResetItems.QrFeatures: branch.SetQrFeatures(null); break;
                case ResetItems.Payment: branch.ResetPaymentSettings(); break;
                case ResetItems.DayEnd: branch.ResetDayEnd(); break;
                case ResetItems.RestaurantInfo: branch.ResetInfo(owner.FullName, owner.PhoneNumber, owner.Email); break;
                case ResetItems.DeliveryZones:
                    // Eski paket siparişler bölgenin adını ve ücretini kendi üzerinde tutar (DeliveryZoneId boşalır).
                    Guid branchId = branch.Id;
                    await DataStore.DeleteAsync(db, db.DeliveryZones, s => s.Where(z => z.BranchId == branchId), ct);
                    break;
            }
        }
        return keys;
    }
}

public class PreviewSettingsResetQuery : ResetSelection, IRequest<Result<ResetPreviewDto>>
{
}

public class PreviewSettingsResetQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<PreviewSettingsResetQuery, Result<ResetPreviewDto>>
{
    public async Task<Result<ResetPreviewDto>> Handle(PreviewSettingsResetQuery request, CancellationToken cancellationToken)
    {
        (_, List<Branch> branches, IReadOnlyList<string> items, string? error) =
            await ResetResolver.ResolveAsync(db, currentUser, request, tracking: false, cancellationToken);
        return error is not null
            ? Result<ResetPreviewDto>.Failure(error)
            : Result<ResetPreviewDto>.Success(ResetResolver.Preview(branches, items));
    }
}

public class ResetSettingsCommand : ResetSelection, IRequest<Result<ResetPreviewDto>>, IOwnerConfirmation
{
    public string RestaurantName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class ResetSettingsCommandHandler(
    IAppDbContext db,
    ICurrentUserService currentUser,
    IPasswordHasher<User> passwordHasher,
    IImageStorageService imageStorage,
    ILogger<ResetSettingsCommandHandler> logger)
    : IRequestHandler<ResetSettingsCommand, Result<ResetPreviewDto>>
{
    public async Task<Result<ResetPreviewDto>> Handle(ResetSettingsCommand request, CancellationToken cancellationToken)
    {
        (Company? company, List<Branch> branches, IReadOnlyList<string> items, string? error) =
            await ResetResolver.ResolveAsync(db, currentUser, request, tracking: true, cancellationToken);
        if (error is not null)
            return Result<ResetPreviewDto>.Failure(error);

        (User? owner, string? confirmError) = await OwnerDataAccess.ConfirmAsync(db, passwordHasher, company!, request, cancellationToken);
        if (owner is null)
            return Result<ResetPreviewDto>.Failure(confirmError!);

        List<string> keys = [];
        await DataStore.RunInTransactionAsync(db, async () =>
        {
            foreach (Branch branch in branches)
            {
                keys.AddRange(await ResetResolver.ApplyAsync(db, branch, items, owner, cancellationToken));
                db.AuditLogs.Add(AuditLog.Create(branch.Id, owner.FullName, AuditLogCategory.System, AuditLogSeverity.Warning,
                    "SettingsReset", $"{owner.FullName} şu ayarları sıfırladı: {string.Join(", ", items.Select(ResetItems.Label))}.",
                    nameof(Branch), branch.Id));
            }
        }, cancellationToken);

        logger.LogWarning("Ayar sıfırlama: şirket {CompanyId} şubeler {Branches} maddeler {Items}.",
            company!.Id, string.Join(",", branches.Select(b => b.Id)), string.Join(",", items));

        await DataFiles.DeleteAsync(imageStorage, keys, [], logger, cancellationToken);
        return Result<ResetPreviewDto>.Success(ResetResolver.Preview(branches, items));
    }
}
