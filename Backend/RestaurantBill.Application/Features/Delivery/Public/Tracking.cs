using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Delivery.Public;

internal static class TrackingLookup
{
    // Anahtar rastgele 128 bittir; yine de yalnızca slug'ın restoranındaki sipariş bulunur.
    public static async Task<(DeliveryOrder? Order, Branch? Branch)> FindAsync(
        IAppDbContext db, ITenantResolver tenant, string token, bool track, CancellationToken cancellationToken)
    {
        string normalized = token?.Trim().ToLowerInvariant() ?? string.Empty;
        if (normalized.Length != AccessToken.Length)
            return (null, null);

        Company? company = await CustomerSiteScope.ResolveCompanyAsync(db, tenant, cancellationToken);
        if (company is null)
            return (null, null);

        IQueryable<DeliveryOrder> query = db.DeliveryOrders.Include(d => d.Lines);
        if (!track)
            query = query.AsNoTracking();

        DeliveryOrder? order = await query.FirstOrDefaultAsync(d => d.AccessToken == normalized && !d.IsDeleted, cancellationToken);
        if (order is null)
            return (null, null);

        Branch? branch = await db.Branches.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == order.BranchId && b.CompanyId == company.Id && !b.IsDeleted, cancellationToken);
        return branch is null ? (null, null) : (order, branch);
    }
}

// ── Takip sayfası ───────────────────────────────────────────────────────────────────────────────
public class GetDeliveryTrackingQuery : IRequest<Result<DeliveryTrackingDto>>
{
    public string Token { get; set; } = string.Empty;
}

public class GetDeliveryTrackingQueryHandler(IAppDbContext db, ITenantResolver tenant)
    : IRequestHandler<GetDeliveryTrackingQuery, Result<DeliveryTrackingDto>>
{
    public async Task<Result<DeliveryTrackingDto>> Handle(GetDeliveryTrackingQuery request, CancellationToken cancellationToken)
    {
        var (order, branch) = await TrackingLookup.FindAsync(db, tenant, request.Token, track: false, cancellationToken);
        if (order is null || branch is null)
            return Result<DeliveryTrackingDto>.Failure(DeliveryScope.TrackingNotFoundMessage);

        Dictionary<Guid, string> names = await db.LoadSelectionNamesAsync([order], cancellationToken);

        return Result<DeliveryTrackingDto>.Success(new DeliveryTrackingDto
        {
            Number = order.Number,
            Status = order.Status,
            StatusLabel = DeliveryScope.CustomerLabel(order.Status),
            StatusDescription = DeliveryScope.CustomerDescription(order),
            CustomerName = DeliveryScope.MaskName(order.CustomerName),
            CustomerPhone = DeliveryScope.MaskPhone(order.CustomerPhone),
            ZoneName = order.ZoneName,
            PaymentPreference = order.PaymentPreference,
            Lines = DeliveryScope.ToLineDtos(order, names),
            Subtotal = order.Subtotal,
            DeliveryFee = order.DeliveryFee,
            Total = order.Total,
            CreatedAt = order.CreatedAt,
            EstimatedMinutes = order.EstimatedMinutes,
            EstimatedDeliveryAt = order.AcceptedAt is DateTime acceptedAt && order.EstimatedMinutes is int eta ? acceptedAt.AddMinutes(eta) : null,
            DeliveredAt = order.DeliveredAt,
            RejectReason = order.RejectReason,
            CancelReason = order.CancelReason,
            CanCancel = order.Status == DeliveryOrderStatus.Received,
            BranchName = branch.BranchName,
            RestaurantPhone = branch.Number
        });
    }
}

// ── Müşteri iptali: yalnızca restoran onaylamadan önce ─────────────────────────────────────────────
public class CancelDeliveryOrderByCustomerCommand : IRequest<Result>
{
    public string Token { get; set; } = string.Empty;
}

public class CancelDeliveryOrderByCustomerCommandHandler(
    IAppDbContext db, ITenantResolver tenant, ICashierNotificationService cashierNotifications, TimeProvider clock)
    : IRequestHandler<CancelDeliveryOrderByCustomerCommand, Result>
{
    public async Task<Result> Handle(CancelDeliveryOrderByCustomerCommand request, CancellationToken cancellationToken)
    {
        var (order, _) = await TrackingLookup.FindAsync(db, tenant, request.Token, track: true, cancellationToken);
        if (order is null)
            return Result.Failure(DeliveryScope.TrackingNotFoundMessage);

        try
        {
            order.CancelByCustomer(clock.GetUtcNow().UtcDateTime);
        }
        catch (DomainException ex)
        {
            return Result.Failure(ex.Message);
        }

        db.AddAudit(order, "Online müşteri", "DeliveryOrderCancelledByCustomer", $"Müşteri online paket sipariş #{order.Number}'i iptal etti.");
        await db.SaveChangesAsync(cancellationToken);

        await cashierNotifications.SendDeliveryOrdersChangedAsync(order.BranchId,
            new DeliveryOrdersChangedDto { Id = order.Id, Status = order.Status });
        return Result.Success();
    }
}
