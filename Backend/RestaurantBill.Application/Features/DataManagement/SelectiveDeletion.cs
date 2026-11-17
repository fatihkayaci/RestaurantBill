using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.DataManagement;

// "Verileri sil → Seçerek sil": sahip şubeleri ve grupları seçer, önizlemede sayıları görür, adı ve şifresiyle onaylar.

public class DataSelection
{
    /// <summary>Boş: şirketin tek şubesi (birden çok şube varsa en az biri seçilmeli).</summary>
    public List<Guid> BranchIds { get; set; } = [];
    public List<string> Groups { get; set; } = [];
    /// <summary>"yyyy-MM-dd": yalnızca bu günden (şubenin yerel saatiyle) eski kayıtlar. Boş: hepsi. Geçmiş gruplarına uygulanır.</summary>
    public string? OlderThan { get; set; }
}

internal static class SelectionResolver
{
    public const string NoGroupMessage = "En az bir veri grubu seçin.";
    public const string BadDateMessage = "Geçerli bir tarih seçin.";

    public static async Task<(Company? Company, List<DeletionPlan> Plans, string? Error)> ResolveAsync(
        IAppDbContext db, ICurrentUserService currentUser, DataSelection selection, bool tracking, CancellationToken ct)
    {
        (Company? company, string? error) = await OwnerDataAccess.ResolveCompanyAsync(db, currentUser, ct);
        if (company is null)
            return (null, [], error);

        IReadOnlyList<string> groups = OwnerDataAccess.CleanKeys(selection.Groups, DataGroups.All);
        if (groups.Count == 0)
            return (company, [], NoGroupMessage);

        if (!OwnerDataAccess.TryParseCutoff(selection.OlderThan, out DateOnly? day))
            return (company, [], BadDateMessage);

        (List<Branch> branches, string? branchError) = await OwnerDataAccess.ResolveBranchesAsync(db, company, selection.BranchIds, ct, tracking);
        if (branchError is not null)
            return (company, [], branchError);

        List<DeletionPlan> plans = branches
            .Select(b => new DeletionPlan(b, groups, OwnerDataAccess.CutoffUtc(day, b.TimeZoneId)))
            .ToList();
        return (company, plans, null);
    }

    public static async Task<DeletionPreviewDto> PreviewAsync(DataDeletionEngine engine, IEnumerable<DeletionPlan> plans, CancellationToken ct)
    {
        DeletionPreviewDto preview = new();
        foreach (DeletionPlan plan in plans)
        {
            List<DeletionGroupDto> groups = await engine.CountAsync(plan, ct);
            preview.Branches.Add(new BranchDeletionPreviewDto { BranchId = plan.BranchId, BranchName = plan.Branch.BranchName, Groups = groups });
            preview.Blockers.AddRange(await engine.FindBlockersAsync(plan, ct));
        }
        preview.TotalCount = preview.Branches.Sum(b => b.Groups.Sum(g => g.Lines.Sum(l => l.Count)));
        return preview;
    }
}

public class GetDataManagementOverviewQuery : IRequest<Result<DataManagementOverviewDto>>
{
}

public class GetDataManagementOverviewQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<GetDataManagementOverviewQuery, Result<DataManagementOverviewDto>>
{
    public async Task<Result<DataManagementOverviewDto>> Handle(GetDataManagementOverviewQuery request, CancellationToken cancellationToken)
    {
        (Company? company, string? error) = await OwnerDataAccess.ResolveCompanyAsync(db, currentUser, cancellationToken);
        if (company is null)
            return Result<DataManagementOverviewDto>.Failure(error!);

        List<DataBranchDto> branchList = await db.Branches.AsNoTracking()
            .Where(b => b.CompanyId == company.Id && !b.IsDeleted)
            .OrderBy(b => b.CreatedAt)
            .Select(b => new DataBranchDto { Id = b.Id, Name = b.BranchName })
            .ToListAsync(cancellationToken);

        return Result<DataManagementOverviewDto>.Success(new DataManagementOverviewDto
        {
            CompanyName = company.Name,
            Branches = branchList,
            Groups = DataGroups.All.Select(g => new DataOptionDto { Key = g, Label = DataGroups.Label(g), AcceptsDate = DataGroups.History.Contains(g) }).ToList(),
            ResetItems = ResetItems.All.Select(i => new DataOptionDto { Key = i, Label = ResetItems.Label(i), Description = ResetItems.Description(i) }).ToList(),
            ClosureGraceDays = Company.ClosureGraceDays,
        });
    }
}

public class PreviewDataDeletionQuery : DataSelection, IRequest<Result<DeletionPreviewDto>>
{
}

public class PreviewDataDeletionQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<PreviewDataDeletionQuery, Result<DeletionPreviewDto>>
{
    public async Task<Result<DeletionPreviewDto>> Handle(PreviewDataDeletionQuery request, CancellationToken cancellationToken)
    {
        (_, List<DeletionPlan> plans, string? error) = await SelectionResolver.ResolveAsync(db, currentUser, request, tracking: false, cancellationToken);
        if (error is not null)
            return Result<DeletionPreviewDto>.Failure(error);

        return Result<DeletionPreviewDto>.Success(await SelectionResolver.PreviewAsync(new DataDeletionEngine(db), plans, cancellationToken));
    }
}

public class DeleteDataCommand : DataSelection, IRequest<Result<DeletionPreviewDto>>, IOwnerConfirmation
{
    public string RestaurantName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class DeleteDataCommandHandler(
    IAppDbContext db,
    ICurrentUserService currentUser,
    IPasswordHasher<User> passwordHasher,
    IImageStorageService imageStorage,
    ILogger<DeleteDataCommandHandler> logger)
    : IRequestHandler<DeleteDataCommand, Result<DeletionPreviewDto>>
{
    public async Task<Result<DeletionPreviewDto>> Handle(DeleteDataCommand request, CancellationToken cancellationToken)
    {
        (Company? company, List<DeletionPlan> plans, string? error) =
            await SelectionResolver.ResolveAsync(db, currentUser, request, tracking: true, cancellationToken);
        if (error is not null)
            return Result<DeletionPreviewDto>.Failure(error);

        (User? owner, string? confirmError) = await OwnerDataAccess.ConfirmAsync(db, passwordHasher, company!, request, cancellationToken);
        if (owner is null)
            return Result<DeletionPreviewDto>.Failure(confirmError!);

        DataDeletionEngine engine = new(db);
        DeletionPreviewDto summary = await SelectionResolver.PreviewAsync(engine, plans, cancellationToken);
        if (summary.Blockers.Count > 0)
            return Result<DeletionPreviewDto>.Failure(string.Join(" ", summary.Blockers));

        DeletionOutcome outcome = new();
        await DataStore.RunInTransactionAsync(db, async () =>
        {
            foreach (DeletionPlan plan in plans)
                await engine.ExecuteAsync(plan, outcome, cancellationToken);
            await engine.DeleteOrphanUsersAsync(outcome.StaffUserIds, cancellationToken);

            foreach (BranchDeletionPreviewDto branch in summary.Branches)
            {
                string what = string.Join(", ", branch.Groups.Select(g => g.Label));
                string when = string.IsNullOrWhiteSpace(request.OlderThan) || !branch.Groups.Any(g => g.DateFiltered)
                    ? string.Empty
                    : $" ({request.OlderThan} tarihinden eski geçmiş)";
                db.AuditLogs.Add(AuditLog.Create(branch.BranchId, owner.FullName, AuditLogCategory.System, AuditLogSeverity.Critical,
                    "DataDeleted", $"{owner.FullName} şu verileri sildi: {what}{when}.", nameof(Branch), branch.BranchId,
                    $"{{\"total\":{branch.Groups.Sum(g => g.Lines.Sum(l => l.Count))}}}"));
            }
        }, cancellationToken);

        logger.LogWarning("Veri silme: şirket {CompanyId} sahibi {UserId} şubeler {Branches} gruplar {Groups} tarih {OlderThan} — {Total} kayıt.",
            company!.Id, owner.Id, string.Join(",", plans.Select(p => p.BranchId)), string.Join(",", plans[0].Groups),
            request.OlderThan ?? "tümü", summary.TotalCount);

        await DataFiles.DeleteAsync(imageStorage, outcome.FileKeys, [], logger, cancellationToken);
        return Result<DeletionPreviewDto>.Success(summary);
    }
}
