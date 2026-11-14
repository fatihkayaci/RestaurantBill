using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Delivery.Settings;

// Admin "Online sipariş → Engelli numaralar": şubenin online sipariş almadığı numaralar. Müşteri
// "Sipariş alınamadı, lütfen restoranı arayın." görür.
internal static class BlockedPhoneOps
{
    public const string AlreadyBlockedMessage = "Bu numara zaten engelli.";

    public static async Task<Result<BlockedPhoneDto>> BlockAsync(IAppDbContext db, ICurrentUserService currentUser, Guid branchId, string phone,
        string? reason, string source, CancellationToken cancellationToken)
    {
        BlockedPhone blocked;
        try
        {
            blocked = BlockedPhone.Create(branchId, phone, reason, currentUser.UserId);
        }
        catch (DomainException ex)
        {
            return Result<BlockedPhoneDto>.Failure(ex.Message);
        }

        bool exists = await db.BlockedPhones.AnyAsync(b => b.BranchId == branchId && b.Phone == blocked.Phone && !b.IsDeleted, cancellationToken);
        if (exists)
            return Result<BlockedPhoneDto>.Failure(AlreadyBlockedMessage);

        db.BlockedPhones.Add(blocked);
        string actor = await db.ActorNameAsync(currentUser, cancellationToken);
        db.AuditLogs.Add(AuditLog.Create(branchId, actor, AuditLogCategory.System, AuditLogSeverity.Warning, "PhoneBlocked",
            $"{actor} {DeliveryScope.MaskPhone(blocked.Phone)} numarasını online siparişe kapattı{source}.", nameof(BlockedPhone), blocked.Id));
        await db.SaveChangesAsync(cancellationToken);

        return Result<BlockedPhoneDto>.Success(new BlockedPhoneDto
        {
            Id = blocked.Id,
            Phone = blocked.Phone,
            Reason = blocked.Reason,
            CreatedAt = blocked.CreatedAt,
            BlockedByName = actor
        });
    }
}

public class GetBlockedPhonesQuery : IRequest<Result<List<BlockedPhoneDto>>>
{
}

public class GetBlockedPhonesQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<GetBlockedPhonesQuery, Result<List<BlockedPhoneDto>>>
{
    public async Task<Result<List<BlockedPhoneDto>>> Handle(GetBlockedPhonesQuery request, CancellationToken cancellationToken)
    {
        List<BlockedPhone> phones = await db.BlockedPhones.AsNoTracking()
            .Where(b => b.BranchId == currentUser.BranchId && !b.IsDeleted)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync(cancellationToken);

        List<Guid> userIds = phones.Select(p => p.BlockedByUserId).Distinct().ToList();
        Dictionary<Guid, string> names = await db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);

        return Result<List<BlockedPhoneDto>>.Success(phones.Select(p => new BlockedPhoneDto
        {
            Id = p.Id,
            Phone = p.Phone,
            Reason = p.Reason,
            CreatedAt = p.CreatedAt,
            BlockedByName = names.GetValueOrDefault(p.BlockedByUserId, string.Empty)
        }).ToList());
    }
}

public class BlockPhoneCommand : IRequest<Result<BlockedPhoneDto>>
{
    public string Phone { get; set; } = string.Empty;
    public string? Reason { get; set; }
}

public class BlockPhoneCommandValidator : AbstractValidator<BlockPhoneCommand>
{
    public BlockPhoneCommandValidator()
    {
        RuleFor(x => x.Phone).Must(TurkishPhone.IsValid).WithMessage("Geçerli bir telefon numarası girin.");
        RuleFor(x => x.Reason).MaximumLength(BlockedPhone.ReasonMaxLength).WithMessage($"Neden en fazla {BlockedPhone.ReasonMaxLength} karakter olabilir.");
    }
}

public class BlockPhoneCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<BlockPhoneCommand, Result<BlockedPhoneDto>>
{
    public async Task<Result<BlockedPhoneDto>> Handle(BlockPhoneCommand request, CancellationToken cancellationToken)
    {
        bool branchExists = await db.Branches.AnyAsync(b => b.Id == currentUser.BranchId && !b.IsDeleted, cancellationToken);
        if (!branchExists)
            return Result<BlockedPhoneDto>.Failure("Şube bulunamadı.");

        return await BlockedPhoneOps.BlockAsync(db, currentUser, currentUser.BranchId, request.Phone, request.Reason, string.Empty, cancellationToken);
    }
}

/// <summary>Online siparişin ekranından "Bu numarayı engelle": siparişin şubesinde engellenir.</summary>
public class BlockDeliveryOrderPhoneCommand : IRequest<Result<BlockedPhoneDto>>
{
    public Guid DeliveryOrderId { get; set; }
    public string? Reason { get; set; }
}

public class BlockDeliveryOrderPhoneCommandValidator : AbstractValidator<BlockDeliveryOrderPhoneCommand>
{
    public BlockDeliveryOrderPhoneCommandValidator()
    {
        RuleFor(x => x.Reason).MaximumLength(BlockedPhone.ReasonMaxLength).WithMessage($"Neden en fazla {BlockedPhone.ReasonMaxLength} karakter olabilir.");
    }
}

public class BlockDeliveryOrderPhoneCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<BlockDeliveryOrderPhoneCommand, Result<BlockedPhoneDto>>
{
    public async Task<Result<BlockedPhoneDto>> Handle(BlockDeliveryOrderPhoneCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await db.GetAccessibleBranchIdsAsync(currentUser, cancellationToken);
        var order = await db.DeliveryOrders.AsNoTracking()
            .Where(d => d.Id == request.DeliveryOrderId && branchIds.Contains(d.BranchId) && !d.IsDeleted)
            .Select(d => new { d.BranchId, d.CustomerPhone, d.Number })
            .FirstOrDefaultAsync(cancellationToken);
        if (order is null)
            return Result<BlockedPhoneDto>.Failure(DeliveryScope.NotFoundMessage);

        return await BlockedPhoneOps.BlockAsync(db, currentUser, order.BranchId, order.CustomerPhone, request.Reason,
            $" (paket sipariş #{order.Number})", cancellationToken);
    }
}

public class UnblockPhoneCommand : IRequest<Result>
{
    public Guid Id { get; set; }
}

public class UnblockPhoneCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<UnblockPhoneCommand, Result>
{
    public async Task<Result> Handle(UnblockPhoneCommand request, CancellationToken cancellationToken)
    {
        BlockedPhone? blocked = await db.BlockedPhones
            .FirstOrDefaultAsync(b => b.Id == request.Id && b.BranchId == currentUser.BranchId && !b.IsDeleted, cancellationToken);
        if (blocked is null)
            return Result.Failure("Böyle bir engelli numara bulunamadı.");

        blocked.MarkAsDeleted();
        string actor = await db.ActorNameAsync(currentUser, cancellationToken);
        db.AuditLogs.Add(AuditLog.Create(blocked.BranchId, actor, AuditLogCategory.System, AuditLogSeverity.Info, "PhoneUnblocked",
            $"{actor} {DeliveryScope.MaskPhone(blocked.Phone)} numarasının engelini kaldırdı.", nameof(BlockedPhone), blocked.Id));
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
