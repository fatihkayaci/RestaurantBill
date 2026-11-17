using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.DataManagement;

// "Hesabımı kapat ve beni sil": her zaman şirketin tamamı. Kapatınca şirket hemen durur: personel girişi ve oturumları,
// müşteri sitesi, QR ve sipariş sayfaları. Sahip 30 gün içinde girip vazgeçebilir; sonra CompanyPurger kalıcı olarak siler.

public class GetClosureStatusQuery : IRequest<Result<ClosureStatusDto>>
{
}

public class GetClosureStatusQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<GetClosureStatusQuery, Result<ClosureStatusDto>>
{
    public async Task<Result<ClosureStatusDto>> Handle(GetClosureStatusQuery request, CancellationToken cancellationToken)
    {
        (Company? company, string? error) = await OwnerDataAccess.ResolveCompanyAsync(db, currentUser, cancellationToken);
        if (company is null)
            return Result<ClosureStatusDto>.Failure(error!);

        return Result<ClosureStatusDto>.Success(new ClosureStatusDto
        {
            CompanyName = company.Name,
            IsClosed = company.IsClosed,
            ClosedAt = company.ClosedAt,
            DeletionScheduledAt = company.DeletionScheduledAt,
        });
    }
}

public class PreviewAccountClosureQuery : IRequest<Result<ClosurePreviewDto>>
{
}

public class PreviewAccountClosureQueryHandler(IAppDbContext db, ICurrentUserService currentUser, TimeProvider? clock = null)
    : IRequestHandler<PreviewAccountClosureQuery, Result<ClosurePreviewDto>>
{
    public async Task<Result<ClosurePreviewDto>> Handle(PreviewAccountClosureQuery request, CancellationToken cancellationToken)
    {
        (Company? company, string? error) = await OwnerDataAccess.ResolveCompanyAsync(db, currentUser, cancellationToken);
        if (company is null)
            return Result<ClosurePreviewDto>.Failure(error!);

        List<Branch> branches = await db.Branches.AsNoTracking()
            .Where(b => b.CompanyId == company.Id && !b.IsDeleted)
            .OrderBy(b => b.CreatedAt)
            .ToListAsync(cancellationToken);

        DataDeletionEngine engine = new(db);
        ClosurePreviewDto preview = new()
        {
            CompanyName = company.Name,
            GraceDays = Company.ClosureGraceDays,
            DeletionDate = (clock ?? TimeProvider.System).GetUtcNow().UtcDateTime.AddDays(Company.ClosureGraceDays),
        };
        foreach (Branch branch in branches)
        {
            preview.Branches.Add(new BranchDeletionPreviewDto
            {
                BranchId = branch.Id,
                BranchName = branch.BranchName,
                Groups = await engine.CountAsync(new DeletionPlan(branch, DataGroups.All, null), cancellationToken),
            });
        }

        List<Guid> branchIds = branches.Select(b => b.Id).ToList();
        preview.StaffCount = await db.UserBranches
            .Where(ub => branchIds.Contains(ub.BranchId) && ub.Role != UserRole.Owner)
            .Select(ub => ub.UserId).Distinct().CountAsync(cancellationToken);
        return Result<ClosurePreviewDto>.Success(preview);
    }
}

public class CloseAccountCommand : IRequest<Result<ClosureStatusDto>>, IOwnerConfirmation
{
    public string RestaurantName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class CloseAccountCommandHandler(
    IAppDbContext db,
    ICurrentUserService currentUser,
    IPasswordHasher<User> passwordHasher,
    ILogger<CloseAccountCommandHandler> logger,
    CompanyClosureCache? closureCache = null,
    TimeProvider? clock = null)
    : IRequestHandler<CloseAccountCommand, Result<ClosureStatusDto>>
{
    public async Task<Result<ClosureStatusDto>> Handle(CloseAccountCommand request, CancellationToken cancellationToken)
    {
        (Company? company, string? error) = await OwnerDataAccess.ResolveCompanyAsync(db, currentUser, cancellationToken, tracking: true);
        if (company is null)
            return Result<ClosureStatusDto>.Failure(error!);

        (User? owner, string? confirmError) = await OwnerDataAccess.ConfirmAsync(db, passwordHasher, company, request, cancellationToken);
        if (owner is null)
            return Result<ClosureStatusDto>.Failure(confirmError!);

        DateTime now = (clock ?? TimeProvider.System).GetUtcNow().UtcDateTime;
        try
        {
            company.Close(now);
        }
        catch (DomainException ex)
        {
            return Result<ClosureStatusDto>.Failure(ex.Message);
        }

        List<Guid> branchIds = await db.Branches
            .Where(b => b.CompanyId == company.Id)
            .Select(b => b.Id)
            .ToListAsync(cancellationToken);

        // Personelin oturumları hemen kapanır; sahibin oturumu kalır (vazgeç ekranını görebilsin).
        List<RefreshToken> staffTokens = await db.RefreshTokens
            .Where(rt => branchIds.Contains(rt.BranchId) && rt.Role != UserRole.Owner && rt.RevokedAt == null)
            .ToListAsync(cancellationToken);
        foreach (RefreshToken token in staffTokens)
            token.Revoke();

        if (branchIds.Count > 0)
        {
            db.AuditLogs.Add(AuditLog.Create(branchIds[0], owner.FullName, AuditLogCategory.System, AuditLogSeverity.Critical,
                "AccountClosed", $"{owner.FullName} hesabı kapattı. Şirket {company.DeletionScheduledAt:dd.MM.yyyy} tarihinde kalıcı olarak silinecek.",
                nameof(Company), company.Id));
        }

        await db.SaveChangesAsync(cancellationToken);
        closureCache?.Set(company.Id, true, now);

        logger.LogWarning("Hesap kapatıldı: şirket {CompanyId} ({CompanyName}), sahip {UserId}. Kalıcı silme: {DeletionAt:o}. {Tokens} personel oturumu kapatıldı.",
            company.Id, company.Name, owner.Id, company.DeletionScheduledAt, staffTokens.Count);

        return Result<ClosureStatusDto>.Success(new ClosureStatusDto
        {
            CompanyName = company.Name,
            IsClosed = true,
            ClosedAt = company.ClosedAt,
            DeletionScheduledAt = company.DeletionScheduledAt,
        });
    }
}

public class CancelAccountClosureCommand : IRequest<Result<ClosureStatusDto>>
{
}

public class CancelAccountClosureCommandHandler(
    IAppDbContext db,
    ICurrentUserService currentUser,
    ILogger<CancelAccountClosureCommandHandler> logger,
    CompanyClosureCache? closureCache = null,
    TimeProvider? clock = null)
    : IRequestHandler<CancelAccountClosureCommand, Result<ClosureStatusDto>>
{
    public async Task<Result<ClosureStatusDto>> Handle(CancelAccountClosureCommand request, CancellationToken cancellationToken)
    {
        (Company? company, string? error) = await OwnerDataAccess.ResolveCompanyAsync(db, currentUser, cancellationToken, tracking: true);
        if (company is null)
            return Result<ClosureStatusDto>.Failure(error!);

        try
        {
            company.CancelClosure();
        }
        catch (DomainException ex)
        {
            return Result<ClosureStatusDto>.Failure(ex.Message);
        }

        User? owner = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == company.OwnerUserId, cancellationToken);
        Guid? firstBranchId = await db.Branches
            .Where(b => b.CompanyId == company.Id && !b.IsDeleted)
            .OrderBy(b => b.CreatedAt)
            .Select(b => (Guid?)b.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (firstBranchId is Guid branchId)
        {
            string actor = owner?.FullName is { Length: > 0 } name ? name : "Restoran sahibi";
            db.AuditLogs.Add(AuditLog.Create(branchId, actor, AuditLogCategory.System, AuditLogSeverity.Warning,
                "AccountClosureCancelled", $"{actor} hesabı kapatmaktan vazgeçti; şirket yeniden açıldı.", nameof(Company), company.Id));
        }

        await db.SaveChangesAsync(cancellationToken);
        closureCache?.Set(company.Id, false, (clock ?? TimeProvider.System).GetUtcNow().UtcDateTime);
        logger.LogWarning("Hesap kapatmadan vazgeçildi: şirket {CompanyId} ({CompanyName}).", company.Id, company.Name);

        return Result<ClosureStatusDto>.Success(new ClosureStatusDto { CompanyName = company.Name, IsClosed = false });
    }
}
