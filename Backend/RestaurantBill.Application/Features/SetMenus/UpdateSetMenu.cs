using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.SetMenus;

/// <summary>
/// Menünün tamamını günceller. Bölümler Id'lerine göre yerinde güncellenir (yalnızca "Satışta" değişince bölümlere
/// dokunulmaz), gönderilmeyen bölümler silinir. Açık siparişlerdeki menü satırları etkilenmez
/// (fiyatları ve içerikleri eklendikleri anda yazılmıştır).
/// </summary>
public class UpdateSetMenuCommand : SetMenuInput, IRequest<Result>
{
    public Guid Id { get; set; }
}

public class UpdateSetMenuCommandValidator : SetMenuInputValidator<UpdateSetMenuCommand>
{
    public UpdateSetMenuCommandValidator()
    {
        RuleFor(x => x.Id).NotEqual(Guid.Empty).WithMessage("Geçerli bir menü seçilmelidir.");
    }
}

public class UpdateSetMenuCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<UpdateSetMenuCommand, Result>
{
    public async Task<Result> Handle(UpdateSetMenuCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await db.GetAccessibleBranchIdsAsync(currentUser, cancellationToken);
        SetMenu? setMenu = await db.SetMenus
            .Include(s => s.Slots).ThenInclude(slot => slot.Options).ThenInclude(o => o.Product)
            .FirstOrDefaultAsync(s => s.Id == request.Id && branchIds.Contains(s.BranchId), cancellationToken);
        if (setMenu is null)
            return Result.Failure("Böyle bir menü bulunamadı.");

        string name = request.Name.Trim();
        if (await db.SetMenus.AnyAsync(s => s.BranchId == setMenu.BranchId && s.Name == name && s.Id != setMenu.Id, cancellationToken))
            return Result.Failure("Bu isimde bir menü zaten var.");

        Result<List<SetMenuSlotDraft>> slots = await request.ToSlotDraftsAsync(db, setMenu.BranchId, cancellationToken);
        if (slots.IsFailure)
            return Result.Failure(slots.Error!);

        try
        {
            setMenu.Update(name, request.Description, request.IsActive, request.SortOrder ?? setMenu.SortOrder, request.CategoryId);
            setMenu.SetContents(slots.Value!, request.DiscountType, request.DiscountValue);
            if (request.IsFeatured is bool isFeatured)
                setMenu.SetFeatured(isFeatured);
        }
        catch (DomainException ex)
        {
            return Result.Failure(ex.Message);
        }

        await db.AddSetMenuAuditLogAsync(currentUser, setMenu, "SetMenuUpdated", $"{setMenu.Name} menüsünü güncelledi.", AuditLogSeverity.Info, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
