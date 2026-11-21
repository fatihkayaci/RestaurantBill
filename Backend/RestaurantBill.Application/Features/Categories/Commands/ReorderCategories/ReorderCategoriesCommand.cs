using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Categories.Commands.ReorderCategories;

/// <summary>Şubedeki kategorilerin sırası: listedeki ilk kategori menüde ilk görünür.</summary>
public class ReorderCategoriesCommand : IRequest<Result>, IInvalidatesCache
{
    public required List<Guid> OrderedCategoryIds { get; set; }

    public string[] CacheKeysToInvalidate => ["categories:all", "products:all"];
}

public class ReorderCategoriesCommandValidator : AbstractValidator<ReorderCategoriesCommand>
{
    public ReorderCategoriesCommandValidator()
    {
        RuleFor(x => x.OrderedCategoryIds).NotEmpty().WithMessage("Sıralanacak kategori listesi boş olamaz.");
        RuleFor(x => x.OrderedCategoryIds)
            .Must(ids => ids.Distinct().Count() == ids.Count)
            .WithMessage("Aynı kategori birden fazla kez gönderilemez.");
    }
}

public class ReorderCategoriesCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<ReorderCategoriesCommand, Result>
{
    public async Task<Result> Handle(ReorderCategoriesCommand command, CancellationToken cancellationToken)
    {
        Guid branchId = currentUser.BranchId;
        List<Category> categories = await db.Categories
            .Where(c => c.BranchId == branchId)
            .ToListAsync(cancellationToken);

        if (!Reordering.TryApply(categories, command.OrderedCategoryIds, (c, i) => c.SetSortOrder(i)))
            return Result.Failure("Kategori listesi değişmiş. Sayfayı yenileyip tekrar deneyin.");

        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
