using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.SetMenus;

/// <summary>Aktif şubeye yeni menü ekler. Dönen değer menünün Id'si (görsel yüklemek için).</summary>
public class CreateSetMenuCommand : SetMenuInput, IRequest<Result<Guid>>, IIdempotent
{
    public string IdempotencyKey => $"create-set-menu:{Name}";
}

public class CreateSetMenuCommandValidator : SetMenuInputValidator<CreateSetMenuCommand>;

public class CreateSetMenuCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<CreateSetMenuCommand, Result<Guid>>
{
    public async Task<Result<Guid>> Handle(CreateSetMenuCommand request, CancellationToken cancellationToken)
    {
        Guid branchId = currentUser.BranchId;
        if (branchId == Guid.Empty)
            return Result<Guid>.Failure("Geçersiz şube bilgisi.");

        string name = request.Name.Trim();
        if (await db.SetMenus.AnyAsync(s => s.BranchId == branchId && s.Name == name, cancellationToken))
            return Result<Guid>.Failure("Bu isimde bir menü zaten var.");

        Result<List<SetMenuSlotDraft>> slots = await request.ToSlotDraftsAsync(db, branchId, cancellationToken);
        if (slots.IsFailure)
            return Result<Guid>.Failure(slots.Error!);

        SetMenu setMenu;
        try
        {
            setMenu = SetMenu.Create(branchId, name);
            setMenu.Update(name, request.Description, request.IsActive, request.SortOrder, request.CategoryId);
            setMenu.SetContents(slots.Value!, request.DiscountType, request.DiscountValue);
        }
        catch (DomainException ex)
        {
            return Result<Guid>.Failure(ex.Message);
        }

        db.SetMenus.Add(setMenu);
        await db.AddSetMenuAuditLogAsync(currentUser, setMenu, "SetMenuCreated", $"{setMenu.Name} menüsünü ekledi.", AuditLogSeverity.Info, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(setMenu.Id);
    }
}
