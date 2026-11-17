using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CustomerSite.Public;

// Rezervasyon bağlantısı (/rezervasyon/:token): rezervasyon özeti ve ön sipariş. Anahtar rezervasyonda verilen rastgele
// token'dır; rezervasyonun kimliği müşteriye hiç gösterilmez.
internal static class ReservationLink
{
    public static async Task<Reservation?> FindAsync(IAppDbContext db, ITenantResolver tenant, string token, bool track, CancellationToken cancellationToken)
    {
        string normalized = token?.Trim().ToLowerInvariant() ?? string.Empty;
        if (normalized.Length != AccessToken.Length)
            return null;

        Company? company = await CustomerSiteScope.ResolveCompanyAsync(db, tenant, cancellationToken);
        if (company is null)
            return null;

        IQueryable<Reservation> query = db.Reservations
            .Include(r => r.Table).ThenInclude(t => t.Region).ThenInclude(r => r.Branch);
        if (!track)
            query = query.AsNoTracking();

        return await query.FirstOrDefaultAsync(r => r.AccessToken == normalized
            && !r.IsDeleted
            && r.Table.Region.Branch.CompanyId == company.Id
            && !r.Table.Region.Branch.IsDeleted, cancellationToken);
    }

    public static async Task<ReservationDetailDto> BuildAsync(IAppDbContext db, Reservation reservation, DateTime nowUtc, CancellationToken cancellationToken)
    {
        Branch branch = reservation.Table.Region.Branch;
        TimeZoneInfo zone = CustomerSiteScope.ZoneOf(branch.TimeZoneId);
        PreOrderRules.Window window = PreOrderRules.Evaluate(reservation, branch.GetOnlineOrderSettings(), nowUtc, zone);
        DateTime end = CustomerSiteScope.EndOf(reservation);

        OrderRequest? preOrder = await db.OrderRequests.AsNoTracking()
            .IncludeLines()
            .Where(r => r.ReservationId == reservation.Id && r.Kind == OrderRequestKind.PreOrder)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        List<Guid> outOfStock = window.CanPreOrder
            ? await db.Products.AsNoTracking()
                .Where(p => p.Category.BranchId == branch.Id && p.IsActive && p.IsOutOfStock && !p.IsDeleted)
                .Select(p => p.Id)
                .ToListAsync(cancellationToken)
            : [];

        bool pending = preOrder?.Status == OrderRequestStatus.Pending;

        return new ReservationDetailDto
        {
            Code = ReservationCode.Format(reservation.Code),
            Status = (int)reservation.Status,
            GuestName = DeliveryScope.MaskName(reservation.GuestName),
            TableName = reservation.Table.Name,
            PartySize = reservation.PartySize,
            Date = CustomerSiteScope.LocalDate(reservation.ReservationTime, zone),
            Time = CustomerSiteScope.LocalTime(reservation.ReservationTime, zone),
            EndTime = CustomerSiteScope.LocalTime(end, zone),
            StartsAtUtc = reservation.ReservationTime,
            BranchName = branch.BranchName,
            RestaurantPhone = branch.Number,
            BranchId = branch.Id,
            PreOrderWindow = new PreOrderWindowDto
            {
                Enabled = window.Enabled,
                OpensAt = window.OpensAtUtc,
                ClosesAt = window.ClosesAtUtc,
                OpensAtTime = CustomerSiteScope.LocalTime(window.OpensAtUtc, zone),
                ClosesAtTime = CustomerSiteScope.LocalTime(window.ClosesAtUtc, zone),
                CanPreOrder = window.CanPreOrder,
                Reason = window.Reason
            },
            PreOrder = preOrder is null ? null : new PublicPreOrderDto
            {
                Status = (int)preOrder.Status,
                Note = preOrder.Note,
                Total = OrderRequestLines.TotalOf(preOrder),
                Items = preOrder.Items.Select(OrderRequestLines.ToDto).ToList(),
                CanEdit = pending && window.CanPreOrder,
                CanCancel = pending && reservation.Status == ReservationStatus.Confirmed
            },
            OutOfStockProductIds = outOfStock,
            CanCancel = reservation.CanGuestCancel(nowUtc),
            CancelDeadline = reservation.GuestCancelDeadline
        };
    }
}

// ── Rezervasyon sayfası ─────────────────────────────────────────────────────────────────────────
public class GetReservationByTokenQuery : IRequest<Result<ReservationDetailDto>>
{
    public string Token { get; set; } = string.Empty;
}

public class GetReservationByTokenQueryHandler(IAppDbContext db, ITenantResolver tenant, TimeProvider clock)
    : IRequestHandler<GetReservationByTokenQuery, Result<ReservationDetailDto>>
{
    public async Task<Result<ReservationDetailDto>> Handle(GetReservationByTokenQuery request, CancellationToken cancellationToken)
    {
        Reservation? reservation = await ReservationLink.FindAsync(db, tenant, request.Token, track: false, cancellationToken);
        if (reservation is null)
            return Result<ReservationDetailDto>.Failure(PreOrderRules.NotFoundMessage);

        return Result<ReservationDetailDto>.Success(
            await ReservationLink.BuildAsync(db, reservation, clock.GetUtcNow().UtcDateTime, cancellationToken));
    }
}

// ── Ön sipariş ver / değiştir ───────────────────────────────────────────────────────────────────
public class UpsertPreOrderCommand : IRequest<Result<ReservationDetailDto>>
{
    public string Token { get; set; } = string.Empty;
    public List<OrderRequestItemInput> Items { get; set; } = [];
    public string? Note { get; set; }
}

public class UpsertPreOrderCommandValidator : AbstractValidator<UpsertPreOrderCommand>
{
    public UpsertPreOrderCommandValidator()
    {
        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("Sepetiniz boş.")
            .Must(items => items.Count <= OrderRequest.MaxItems).WithMessage($"Bir siparişte en fazla {OrderRequest.MaxItems} kalem olabilir.");
        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Not en fazla 500 karakter olabilir.");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            // Ön sipariş şimdilik yalnız ürün alır; menü (set) kalemi masa QR siparişinde.
            item.RuleFor(i => i.IsSetMenu)
                .Equal(false).WithMessage("Ön siparişe menü eklenemez; menüleri masada sipariş edebilirsiniz.");
            item.RuleFor(i => i.ProductId)
                .Must(id => id is Guid g && g != Guid.Empty).WithMessage("Geçerli bir ürün seçilmelidir.");
            item.RuleFor(i => i.Quantity)
                .InclusiveBetween(1, OrderRequest.MaxQuantity).WithMessage($"Adet 1 ile {OrderRequest.MaxQuantity} arasında olmalı.");
            item.RuleFor(i => i.Note)
                .MaximumLength(300).WithMessage("Ürün notu en fazla 300 karakter olabilir.");
        });
    }
}

public class UpsertPreOrderCommandHandler(
    IAppDbContext db, ITenantResolver tenant, IOrderPricingService pricing, ITableNotificationService tableNotifications, TimeProvider clock)
    : IRequestHandler<UpsertPreOrderCommand, Result<ReservationDetailDto>>
{
    public async Task<Result<ReservationDetailDto>> Handle(UpsertPreOrderCommand request, CancellationToken cancellationToken)
    {
        Reservation? reservation = await ReservationLink.FindAsync(db, tenant, request.Token, track: true, cancellationToken);
        if (reservation is null)
            return Result<ReservationDetailDto>.Failure(PreOrderRules.NotFoundMessage);

        Branch branch = reservation.Table.Region.Branch;
        DateTime now = clock.GetUtcNow().UtcDateTime;
        PreOrderRules.Window window = PreOrderRules.Evaluate(reservation, branch.GetOnlineOrderSettings(), now, CustomerSiteScope.ZoneOf(branch.TimeZoneId));
        if (!window.CanPreOrder)
            return Result<ReservationDetailDto>.Failure(window.Reason!);

        // Fiyat, aktiflik, şube ve "Tükendi" kontrolü paket siparişle aynı yoldan; istemcinin fiyatına bakılmaz.
        List<CartLineInput> lines = request.Items.Select(i => new CartLineInput
        {
            Kind = CartLineInput.ProductKind,
            ProductId = i.ProductId,
            Quantity = i.Quantity,
            Note = i.Note
        }).ToList();
        Result<PricedCart> priced = await pricing.PriceCartAsync(branch.Id, lines, zone: null, cancellationToken);
        if (priced.IsFailure)
            return Result<ReservationDetailDto>.Failure(priced.Error!);

        OrderRequest? preOrder = await PreOrderRules.FindPendingAsync(db, reservation.Id, cancellationToken);
        bool isNew = preOrder is null;
        try
        {
            if (preOrder is null)
            {
                preOrder = OrderRequest.CreatePreOrder(reservation, request.Note);
                db.OrderRequests.Add(preOrder);
            }
            else
            {
                preOrder.ClearItems();
                preOrder.UpdateNote(request.Note);
            }

            foreach (PricedLine line in priced.Value!.Lines)
                preOrder.AddItem(line.Product!, line.Quantity, line.Note, line.UnitPrice);
        }
        catch (DomainException ex)
        {
            return Result<ReservationDetailDto>.Failure(ex.Message);
        }

        db.AuditLogs.Add(AuditLog.Create(branch.Id, "Online müşteri", AuditLogCategory.Order, AuditLogSeverity.Info,
            isNew ? "PreOrderPlaced" : "PreOrderUpdated",
            $"{reservation.GuestName} rezervasyonu için ön sipariş {(isNew ? "verildi" : "değiştirildi")} (₺{priced.Value.Subtotal:0.##}).",
            nameof(Reservation), reservation.Id));

        await db.SaveChangesAsync(cancellationToken);
        await tableNotifications.SendCustomerRequestsChangedAsync(branch.Id);

        return Result<ReservationDetailDto>.Success(await ReservationLink.BuildAsync(db, reservation, now, cancellationToken));
    }
}

// ── Ön siparişi iptal et (müşteri) ──────────────────────────────────────────────────────────────
public class CancelPreOrderCommand : IRequest<Result<ReservationDetailDto>>
{
    public string Token { get; set; } = string.Empty;
}

public class CancelPreOrderCommandHandler(IAppDbContext db, ITenantResolver tenant, ITableNotificationService tableNotifications, TimeProvider clock)
    : IRequestHandler<CancelPreOrderCommand, Result<ReservationDetailDto>>
{
    public async Task<Result<ReservationDetailDto>> Handle(CancelPreOrderCommand request, CancellationToken cancellationToken)
    {
        Reservation? reservation = await ReservationLink.FindAsync(db, tenant, request.Token, track: true, cancellationToken);
        if (reservation is null)
            return Result<ReservationDetailDto>.Failure(PreOrderRules.NotFoundMessage);

        OrderRequest? preOrder = await PreOrderRules.FindPendingAsync(db, reservation.Id, cancellationToken);
        if (preOrder is null || reservation.Status != ReservationStatus.Confirmed)
            return Result<ReservationDetailDto>.Failure("İptal edilecek bekleyen bir ön sipariş yok.");

        preOrder.Cancel();
        Guid branchId = reservation.Table.Region.BranchId;
        db.AuditLogs.Add(AuditLog.Create(branchId, "Online müşteri", AuditLogCategory.Order, AuditLogSeverity.Info,
            "PreOrderCancelledByCustomer", $"{reservation.GuestName} rezervasyonunun ön siparişini müşteri iptal etti.",
            nameof(Reservation), reservation.Id));

        await db.SaveChangesAsync(cancellationToken);
        await tableNotifications.SendCustomerRequestsChangedAsync(branchId);

        return Result<ReservationDetailDto>.Success(
            await ReservationLink.BuildAsync(db, reservation, clock.GetUtcNow().UtcDateTime, cancellationToken));
    }
}
