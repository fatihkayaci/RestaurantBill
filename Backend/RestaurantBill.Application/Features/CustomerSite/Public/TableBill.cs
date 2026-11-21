using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CustomerSite.Public;

// ── "Masanın hesabı" ────────────────────────────────────────────────────────────────────────────
// Masanın sahibi telefon (QrTableLock) açık hesabın bütün kalemlerini görür: garsonun eklediği ürünler ve menüler dahil,
// adet, fiyat ve kalan. Başka telefona (ya da anahtarsız isteğe) hiçbir veri dönmez; mesaj tarafsızdır.
public class GetTableBillQuery : IRequest<Result<PublicTableBillDto>>
{
    public Guid TableId { get; set; }
    /// <summary>Telefonun cihaz anahtarının özeti (X-Device-Token → QrTableLock.HashToken).</summary>
    public string? DeviceTokenHash { get; set; }
}

public class GetTableBillQueryValidator : AbstractValidator<GetTableBillQuery>
{
    public GetTableBillQueryValidator()
    {
        RuleFor(x => x.TableId).NotEqual(Guid.Empty).WithMessage("Geçerli bir masa seçilmelidir.");
    }
}

public class GetTableBillQueryHandler(IAppDbContext db, ITenantResolver tenant)
    : IRequestHandler<GetTableBillQuery, Result<PublicTableBillDto>>
{
    public async Task<Result<PublicTableBillDto>> Handle(GetTableBillQuery request, CancellationToken cancellationToken)
    {
        string? tokenHash = request.DeviceTokenHash;
        if (tokenHash is null)
            return Result<PublicTableBillDto>.Failure(QrTableLock.NotOwnerMessage);

        Table? table = await CustomerSiteScope.ResolveTableAsync(db, tenant, request.TableId, cancellationToken);
        if (table is null)
            return Result<PublicTableBillDto>.Failure(QrTableLock.NotOwnerMessage);

        Order? order = await db.Orders.AsNoTracking()
            .Include(o => o.OrderItems).ThenInclude(i => i.Product)
            .Include(o => o.OrderItems).ThenInclude(i => i.SetMenu)
            .Where(o => o.TableId == table.Id && o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        // Hesap yalnız garsonun onayladığı talebin telefonuna bağlanır; bekleyen ilk talep masayı tutar ama hesabı
        // göstermez (dışarıdan gelen talep reddedilene kadar masadakilerin hesabı görünmesin).
        QrLockState state = QrTableLock.StateOf(await QrTableLock.OwnerHashAsync(db, table.Id, order, cancellationToken), tokenHash);
        if (state != QrLockState.Mine)
            return Result<PublicTableBillDto>.Failure(QrTableLock.NotOwnerMessage);

        if (order is null || QrTableLock.StateOf(order.QrOwnerTokenHash, tokenHash) != QrLockState.Mine)
            return Result<PublicTableBillDto>.Success(new PublicTableBillDto { HasBill = false });

        OrderDto dto = order.ToDto();
        return Result<PublicTableBillDto>.Success(new PublicTableBillDto
        {
            HasBill = true,
            Items = dto.OrderItems.Select(i => new PublicTableBillLineDto
            {
                Name = i.ProductName,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                LineTotal = i.UnitPrice * i.Quantity,
                Details = i.Components.Select(c => c.ProductName).Where(n => n.Length > 0).ToList(),
                Note = i.Note,
            }).ToList(),
            Total = order.TotalPrice,
            Paid = order.PaidOnAccount,
            Remaining = order.RemainingAmount,
            BillRequestedAt = order.BillRequestedAt,
        });
    }
}
