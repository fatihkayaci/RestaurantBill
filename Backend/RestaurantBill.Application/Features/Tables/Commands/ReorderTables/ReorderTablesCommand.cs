using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.ReorderTables;

/// <summary>Bir bölgedeki masaların sırası: listedeki ilk masa garson, kasa ve yönetici ekranlarında ilk görünür.</summary>
public class ReorderTablesCommand : IRequest<Result>, IInvalidatesCache
{
    public Guid RegionId { get; set; }
    public required List<Guid> OrderedTableIds { get; set; }

    public string[] CacheKeysToInvalidate => ["tables:all"];
}

public class ReorderTablesCommandValidator : AbstractValidator<ReorderTablesCommand>
{
    public ReorderTablesCommandValidator()
    {
        RuleFor(x => x.RegionId).NotEmpty().WithMessage("Bölge seçilmelidir.");
        RuleFor(x => x.OrderedTableIds).NotEmpty().WithMessage("Sıralanacak masa listesi boş olamaz.");
        RuleFor(x => x.OrderedTableIds)
            .Must(ids => ids.Distinct().Count() == ids.Count)
            .WithMessage("Aynı masa birden fazla kez gönderilemez.");
    }
}

public class ReorderTablesCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<ReorderTablesCommand, Result>
{
    public async Task<Result> Handle(ReorderTablesCommand command, CancellationToken cancellationToken)
    {
        Guid branchId = currentUser.BranchId;
        bool regionExists = await db.Regions
            .AnyAsync(r => r.Id == command.RegionId && r.BranchId == branchId, cancellationToken);
        if (!regionExists)
            return Result.Failure("Böyle bir bölge bulunamadı.");

        List<Table> tables = await db.Tables
            .Where(t => t.RegionId == command.RegionId)
            .ToListAsync(cancellationToken);

        // Liste bölgenin tüm masalarını içermeli: eksik ya da başka bölgeden masa, eski bir ekrandan gelmiş demektir.
        if (!Reordering.TryApply(tables, command.OrderedTableIds, (t, i) => t.SetSortOrder(i)))
            return Result.Failure("Masa listesi değişmiş. Sayfayı yenileyip tekrar deneyin.");

        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
