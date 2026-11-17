using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.ReorderProducts;

/// <summary>Bir kategorideki ürünlerin sırası: listedeki ilk ürün menüde ilk görünür.</summary>
public class ReorderProductsCommand : IRequest<Result>, IInvalidatesCache
{
    public Guid CategoryId { get; set; }
    public required List<Guid> OrderedProductIds { get; set; }

    public string[] CacheKeysToInvalidate => ["products:all"];
}

public class ReorderProductsCommandValidator : AbstractValidator<ReorderProductsCommand>
{
    public ReorderProductsCommandValidator()
    {
        RuleFor(x => x.CategoryId).NotEmpty().WithMessage("Kategori seçilmelidir.");
        RuleFor(x => x.OrderedProductIds).NotEmpty().WithMessage("Sıralanacak ürün listesi boş olamaz.");
        RuleFor(x => x.OrderedProductIds)
            .Must(ids => ids.Distinct().Count() == ids.Count)
            .WithMessage("Aynı ürün birden fazla kez gönderilemez.");
    }
}

public class ReorderProductsCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<ReorderProductsCommand, Result>
{
    public async Task<Result> Handle(ReorderProductsCommand command, CancellationToken cancellationToken)
    {
        Guid branchId = currentUser.BranchId;
        bool categoryExists = await db.Categories
            .AnyAsync(c => c.Id == command.CategoryId && c.BranchId == branchId, cancellationToken);
        if (!categoryExists)
            return Result.Failure("Böyle bir kategori bulunamadı.");

        List<Product> products = await db.Products
            .Where(p => p.CategoryId == command.CategoryId)
            .ToListAsync(cancellationToken);

        // Liste kategorinin tüm ürünlerini içermeli: eksik ya da başka kategoriden ürün, eski bir ekrandan gelmiş demektir.
        if (products.Count != command.OrderedProductIds.Count
            || command.OrderedProductIds.Any(id => products.All(p => p.Id != id)))
            return Result.Failure("Ürün listesi değişmiş. Sayfayı yenileyip tekrar deneyin.");

        for (int i = 0; i < command.OrderedProductIds.Count; i++)
            products.First(p => p.Id == command.OrderedProductIds[i]).SetSortOrder(i);

        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
