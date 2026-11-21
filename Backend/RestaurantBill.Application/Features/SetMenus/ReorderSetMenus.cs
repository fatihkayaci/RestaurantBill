using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.SetMenus;

/// <summary>Şubedeki menülerin sırası: listedeki ilk menü sitede, QR menüde, online siparişte ve garsonda ilk görünür.</summary>
public class ReorderSetMenusCommand : IRequest<Result>
{
    public required List<Guid> OrderedSetMenuIds { get; set; }
}

public class ReorderSetMenusCommandValidator : AbstractValidator<ReorderSetMenusCommand>
{
    public ReorderSetMenusCommandValidator()
    {
        RuleFor(x => x.OrderedSetMenuIds).NotEmpty().WithMessage("Sıralanacak menü listesi boş olamaz.");
        RuleFor(x => x.OrderedSetMenuIds)
            .Must(ids => ids.Distinct().Count() == ids.Count)
            .WithMessage("Aynı menü birden fazla kez gönderilemez.");
    }
}

public class ReorderSetMenusCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<ReorderSetMenusCommand, Result>
{
    public async Task<Result> Handle(ReorderSetMenusCommand command, CancellationToken cancellationToken)
    {
        Guid branchId = currentUser.BranchId;
        List<SetMenu> setMenus = await db.SetMenus
            .Where(s => s.BranchId == branchId)
            .ToListAsync(cancellationToken);

        if (!Reordering.TryApply(setMenus, command.OrderedSetMenuIds, (s, i) => s.SetSortOrder(i)))
            return Result.Failure("Menü listesi değişmiş. Sayfayı yenileyip tekrar deneyin.");

        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
