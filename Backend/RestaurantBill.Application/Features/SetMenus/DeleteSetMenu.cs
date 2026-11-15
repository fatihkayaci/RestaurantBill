using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.SetMenus;

public class DeleteSetMenuCommand : IRequest<Result>
{
    public Guid Id { get; set; }
}

/// <summary>Siparişte satırı olan menü silinmez (ürünlerdeki kuralla aynı); pasife alınması önerilir.</summary>
public class DeleteSetMenuCommandHandler(IAppDbContext db, ICurrentUserService currentUser, IImageStorageService imageStorage)
    : IRequestHandler<DeleteSetMenuCommand, Result>
{
    public async Task<Result> Handle(DeleteSetMenuCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await db.GetAccessibleBranchIdsAsync(currentUser, cancellationToken);
        SetMenu? setMenu = await db.SetMenus
            .Include(s => s.Slots).ThenInclude(slot => slot.Options)
            .FirstOrDefaultAsync(s => s.Id == request.Id && branchIds.Contains(s.BranchId), cancellationToken);
        if (setMenu is null)
            return Result.Failure("Böyle bir menü bulunamadı.");

        if (await db.OrderItems.AnyAsync(i => i.SetMenuId == setMenu.Id, cancellationToken))
            return Result.Failure("Bu menüye ait sipariş kayıtları var. Menü silinemez, bunun yerine pasif hale getirebilirsiniz.");

        db.SetMenus.Remove(setMenu);
        await db.AddSetMenuAuditLogAsync(currentUser, setMenu, "SetMenuDeleted", $"{setMenu.Name} menüsünü sildi.", AuditLogSeverity.Warning, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        // Menünün kendi dosyası silinir (en iyi çaba); paylaşılan hazır görsel silinmez.
        await imageStorage.DeleteReplacedImageAsync(setMenu.ImageUrl, cancellationToken);

        return Result.Success();
    }
}

internal static class SetMenuAuditLog
{
    public static async Task AddSetMenuAuditLogAsync(this IAppDbContext db, ICurrentUserService currentUser, SetMenu setMenu,
        string action, string messageTail, AuditLogSeverity severity, CancellationToken cancellationToken)
    {
        User? actor = await db.Users.FirstOrDefaultAsync(u => u.Id == currentUser.UserId, cancellationToken);
        db.AuditLogs.Add(AuditLog.Create(
            currentUser.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.Product,
            severity,
            action,
            $"{actor?.FullName} {messageTail}",
            nameof(SetMenu),
            setMenu.Id));
    }
}
