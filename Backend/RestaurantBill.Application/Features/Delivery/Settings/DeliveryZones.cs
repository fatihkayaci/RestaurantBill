using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Delivery.Settings;

// Admin "Online sipariş → Teslimat bölgeleri": oturumdaki şubenin mahalleleri. Silinen bölge eski siparişlerde adı ve
// ücretiyle kalır (siparişte anlık kopya).
internal static class DeliveryZoneMapping
{
    public static DeliveryZoneDto ToDto(DeliveryZone z) => new()
    {
        Id = z.Id,
        Name = z.Name,
        Fee = z.Fee,
        MinOrderAmount = z.MinOrderAmount,
        EstimatedMinutes = z.EstimatedMinutes,
        IsActive = z.IsActive,
        SortOrder = z.SortOrder
    };

    public static void Audit(IAppDbContext db, Guid branchId, string actor, string action, string message, Guid zoneId)
        => db.AuditLogs.Add(AuditLog.Create(branchId, actor, AuditLogCategory.System, AuditLogSeverity.Info, action, message, nameof(DeliveryZone), zoneId));

    public static Task<bool> NameTakenAsync(IAppDbContext db, Guid branchId, string name, Guid? exceptId, CancellationToken cancellationToken)
    {
        string normalized = name.Trim().ToLower();
        return db.DeliveryZones.AnyAsync(z => z.BranchId == branchId && !z.IsDeleted && z.Id != exceptId && z.Name.ToLower() == normalized, cancellationToken);
    }
}

public class GetDeliveryZonesQuery : IRequest<Result<List<DeliveryZoneDto>>>
{
}

public class GetDeliveryZonesQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<GetDeliveryZonesQuery, Result<List<DeliveryZoneDto>>>
{
    public async Task<Result<List<DeliveryZoneDto>>> Handle(GetDeliveryZonesQuery request, CancellationToken cancellationToken)
    {
        List<DeliveryZone> zones = await db.DeliveryZones.AsNoTracking()
            .Where(z => z.BranchId == currentUser.BranchId && !z.IsDeleted)
            .OrderBy(z => z.SortOrder).ThenBy(z => z.Name)
            .ToListAsync(cancellationToken);
        return Result<List<DeliveryZoneDto>>.Success(zones.Select(DeliveryZoneMapping.ToDto).ToList());
    }
}

public class SaveDeliveryZoneCommand : IRequest<Result<DeliveryZoneDto>>
{
    /// <summary>Boş: yeni bölge.</summary>
    public Guid? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Fee { get; set; }
    public decimal MinOrderAmount { get; set; }
    public int EstimatedMinutes { get; set; }
    public bool IsActive { get; set; } = true;
}

public class SaveDeliveryZoneCommandValidator : AbstractValidator<SaveDeliveryZoneCommand>
{
    public SaveDeliveryZoneCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Bölge adı boş olamaz.")
            .MaximumLength(DeliveryZone.NameMaxLength).WithMessage($"Bölge adı en fazla {DeliveryZone.NameMaxLength} karakter olabilir.");
    }
}

public class SaveDeliveryZoneCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<SaveDeliveryZoneCommand, Result<DeliveryZoneDto>>
{
    public async Task<Result<DeliveryZoneDto>> Handle(SaveDeliveryZoneCommand request, CancellationToken cancellationToken)
    {
        Guid branchId = currentUser.BranchId;
        bool branchExists = await db.Branches.AnyAsync(b => b.Id == branchId && !b.IsDeleted, cancellationToken);
        if (!branchExists)
            return Result<DeliveryZoneDto>.Failure("Şube bulunamadı.");

        if (await DeliveryZoneMapping.NameTakenAsync(db, branchId, request.Name, request.Id, cancellationToken))
            return Result<DeliveryZoneDto>.Failure($"{request.Name.Trim()} adında bir bölge zaten var.");

        DeliveryZone? zone;
        bool isNew = request.Id is null;
        try
        {
            if (isNew)
            {
                int nextSort = (await db.DeliveryZones.Where(z => z.BranchId == branchId && !z.IsDeleted)
                    .MaxAsync(z => (int?)z.SortOrder, cancellationToken) ?? -1) + 1;
                zone = DeliveryZone.Create(branchId, request.Name, request.Fee, request.MinOrderAmount, request.EstimatedMinutes, nextSort);
                zone.SetActive(request.IsActive);
                db.DeliveryZones.Add(zone);
            }
            else
            {
                zone = await db.DeliveryZones.FirstOrDefaultAsync(z => z.Id == request.Id && z.BranchId == branchId && !z.IsDeleted, cancellationToken);
                if (zone is null)
                    return Result<DeliveryZoneDto>.Failure("Böyle bir teslimat bölgesi bulunamadı.");
                zone.Update(request.Name, request.Fee, request.MinOrderAmount, request.EstimatedMinutes, zone.SortOrder);
                zone.SetActive(request.IsActive);
            }
        }
        catch (DomainException ex)
        {
            return Result<DeliveryZoneDto>.Failure(ex.Message);
        }

        string actor = await db.ActorNameAsync(currentUser, cancellationToken);
        DeliveryZoneMapping.Audit(db, branchId, actor, isNew ? "DeliveryZoneCreated" : "DeliveryZoneUpdated",
            $"{actor} {zone.Name} teslimat bölgesini {(isNew ? "ekledi" : "güncelledi")} (ücret ₺{zone.Fee:0.##}, en az ₺{zone.MinOrderAmount:0.##}, {zone.EstimatedMinutes} dk{(zone.IsActive ? "" : ", kapalı")}).",
            zone.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Result<DeliveryZoneDto>.Success(DeliveryZoneMapping.ToDto(zone));
    }
}

public class DeleteDeliveryZoneCommand : IRequest<Result>
{
    public Guid Id { get; set; }
}

public class DeleteDeliveryZoneCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<DeleteDeliveryZoneCommand, Result>
{
    public async Task<Result> Handle(DeleteDeliveryZoneCommand request, CancellationToken cancellationToken)
    {
        DeliveryZone? zone = await db.DeliveryZones
            .FirstOrDefaultAsync(z => z.Id == request.Id && z.BranchId == currentUser.BranchId && !z.IsDeleted, cancellationToken);
        if (zone is null)
            return Result.Failure("Böyle bir teslimat bölgesi bulunamadı.");

        // Silinmiş bölgeye yeni sipariş gelmez; açık siparişler bölgenin kopyasını taşıdığı için etkilenmez.
        zone.SetActive(false);
        zone.MarkAsDeleted();

        string actor = await db.ActorNameAsync(currentUser, cancellationToken);
        DeliveryZoneMapping.Audit(db, zone.BranchId, actor, "DeliveryZoneDeleted", $"{actor} {zone.Name} teslimat bölgesini sildi.", zone.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

/// <summary>Bölgelerin müşteri sitesindeki sırası: verilen Id sırasıyla 0, 1, 2…</summary>
public class ReorderDeliveryZonesCommand : IRequest<Result<List<DeliveryZoneDto>>>
{
    public List<Guid> ZoneIds { get; set; } = [];
}

public class ReorderDeliveryZonesCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<ReorderDeliveryZonesCommand, Result<List<DeliveryZoneDto>>>
{
    public async Task<Result<List<DeliveryZoneDto>>> Handle(ReorderDeliveryZonesCommand request, CancellationToken cancellationToken)
    {
        List<DeliveryZone> zones = await db.DeliveryZones
            .Where(z => z.BranchId == currentUser.BranchId && !z.IsDeleted)
            .ToListAsync(cancellationToken);

        List<Guid> ids = request.ZoneIds ?? [];
        if (ids.Count != zones.Count || ids.Distinct().Count() != ids.Count || ids.Any(id => zones.All(z => z.Id != id)))
            return Result<List<DeliveryZoneDto>>.Failure("Bölge listesi güncel değil. Sayfayı yenileyip tekrar deneyin.");

        for (int index = 0; index < ids.Count; index++)
        {
            DeliveryZone zone = zones.First(z => z.Id == ids[index]);
            zone.Update(zone.Name, zone.Fee, zone.MinOrderAmount, zone.EstimatedMinutes, index);
        }

        await db.SaveChangesAsync(cancellationToken);
        return Result<List<DeliveryZoneDto>>.Success(zones.OrderBy(z => z.SortOrder).Select(DeliveryZoneMapping.ToDto).ToList());
    }
}
