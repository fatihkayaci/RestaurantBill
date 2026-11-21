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
//
// Hesap ödenip kapanınca kilit düşer (masa yeni misafirlere açılır) ama aynı telefon kapanan hesabını bir süre daha
// "Ödendi" olarak görür (PaidBillVisibleFor). Ödenen kalemler ödeme satırlarından (PaymentLineItem) okunur, çünkü ödenen
// sipariş kalemi hesaptan silinir. İptal edilen hesap gösterilmez.
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

public class GetTableBillQueryHandler(IAppDbContext db, ITenantResolver tenant, TimeProvider clock)
    : IRequestHandler<GetTableBillQuery, Result<PublicTableBillDto>>
{
    /// <summary>Kapanan hesap, kapandıktan sonra bu süre boyunca sahibi telefonda "Ödendi" olarak görünür.</summary>
    public static readonly TimeSpan PaidBillVisibleFor = TimeSpan.FromHours(3);

    public async Task<Result<PublicTableBillDto>> Handle(GetTableBillQuery request, CancellationToken cancellationToken)
    {
        string? tokenHash = request.DeviceTokenHash;
        if (tokenHash is null)
            return Result<PublicTableBillDto>.Failure(QrTableLock.NotOwnerMessage);

        Table? table = await CustomerSiteScope.ResolveTableAsync(db, tenant, request.TableId, cancellationToken);
        if (table is null)
            return Result<PublicTableBillDto>.Failure(QrTableLock.NotOwnerMessage);

        Order? order = await WithItems(db.Orders.AsNoTracking())
            .Where(o => o.TableId == table.Id && o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        QrLockState state = QrTableLock.StateOf(await QrTableLock.OwnerHashAsync(db, table.Id, order, cancellationToken), tokenHash);
        Order? paidOrder = await FindRecentPaidOrderAsync(table.Id, tokenHash, cancellationToken);
        DateTime? paidAt = paidOrder is null ? null : PaidAtOf(paidOrder);

        // Açık hesap bu telefona bağlı: canlı hesap.
        if (state == QrLockState.Mine && order is not null && QrTableLock.StateOf(order.QrOwnerTokenHash, tokenHash) == QrLockState.Mine)
            return Result<PublicTableBillDto>.Success(OpenBill(order, paidAt));

        // Bu telefonun az önce ödenen hesabı: masa artık başka telefona bağlı olsa da kendi hesabını görür.
        if (paidOrder is not null)
            return Result<PublicTableBillDto>.Success(await PaidBillAsync(paidOrder, paidAt!.Value, cancellationToken));

        // Hesap yalnız garsonun onayladığı talebin telefonuna bağlanır; bekleyen ilk talep masayı tutar ama hesabı
        // göstermez (dışarıdan gelen talep reddedilene kadar masadakilerin hesabı görünmesin).
        if (state == QrLockState.Mine)
            return Result<PublicTableBillDto>.Success(new PublicTableBillDto { HasBill = false });

        return Result<PublicTableBillDto>.Failure(QrTableLock.NotOwnerMessage);
    }

    private static IQueryable<Order> WithItems(IQueryable<Order> query)
        => query
            .Include(o => o.OrderItems).ThenInclude(i => i.Product)
            .Include(o => o.OrderItems).ThenInclude(i => i.SetMenu);

    // Kapanan sipariş en son kapanışta değişir; UpdatedAt kayıtta (SaveChanges) yazılır.
    private static DateTime PaidAtOf(Order order) => order.UpdatedAt ?? order.CreatedAt;

    /// <summary>Bu telefona bağlı, masada en son ödenen ve görünme süresi dolmamış hesap.</summary>
    private Task<Order?> FindRecentPaidOrderAsync(Guid tableId, string tokenHash, CancellationToken cancellationToken)
    {
        DateTime since = clock.GetUtcNow().UtcDateTime - PaidBillVisibleFor;
        return WithItems(db.Orders.AsNoTracking())
            .Where(o => o.TableId == tableId && o.Status == OrderStatus.Paid && o.QrOwnerTokenHash == tokenHash
                && (o.UpdatedAt ?? o.CreatedAt) >= since)
            .OrderByDescending(o => o.UpdatedAt ?? o.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static PublicTableBillDto OpenBill(Order order, DateTime? lastPaidAt) => new()
    {
        HasBill = true,
        Items = BillLines(order),
        Total = order.TotalPrice,
        Paid = order.PaidOnAccount,
        Remaining = order.RemainingAmount,
        BillRequestedAt = order.BillRequestedAt,
        PaidAt = lastPaidAt,
    };

    private async Task<PublicTableBillDto> PaidBillAsync(Order order, DateTime paidAt, CancellationToken cancellationToken)
    {
        List<Payment> payments = await db.Payments.AsNoTracking()
            .Where(p => p.OrderId == order.Id && !p.IsDeliveryFee)
            .ToListAsync(cancellationToken);
        List<Guid> paymentIds = payments.Select(p => p.Id).ToList();
        List<PaymentLineItem> paidLines = await db.PaymentLineItems.AsNoTracking()
            .Where(l => paymentIds.Contains(l.PaymentId))
            .OrderBy(l => l.CreatedAt)
            .ToListAsync(cancellationToken);

        // Bir ödeme KDV oranı başına ayrı satır yazar, ürün seçerek alınan ödemeler de ayrı ayrı gelir: aynı ürün aynı
        // fiyatla tek satırda toplanır. Ödemesiz kapatılan hesapta kalemler siparişte durur; onlar da eklenir.
        List<PublicTableBillLineDto> items = paidLines
            .GroupBy(l => (l.ProductId, l.SetMenuId, l.ProductName, l.UnitPrice))
            .Select(g => new PublicTableBillLineDto
            {
                Name = g.Key.ProductName,
                Quantity = g.Sum(l => l.Quantity),
                UnitPrice = g.Key.UnitPrice,
                LineTotal = g.Key.UnitPrice * g.Sum(l => l.Quantity),
            })
            .Concat(BillLines(order))
            .ToList();

        decimal total = items.Sum(i => i.LineTotal);
        return new PublicTableBillDto
        {
            HasBill = true,
            IsPaid = true,
            PaidAt = paidAt,
            Items = items,
            Total = total,
            Discount = payments.Sum(p => p.DiscountAmount),
            // Ödeme kaydı yoksa hesap ödemesiz kapatılmıştır (personelin kararı); müşteri için hesap kapanmıştır.
            Paid = payments.Count > 0 ? payments.Sum(p => p.TotalAmount) : total,
            Remaining = 0m,
        };
    }

    private static List<PublicTableBillLineDto> BillLines(Order order)
    {
        OrderDto dto = order.ToDto();
        return dto.OrderItems.Select(i => new PublicTableBillLineDto
        {
            Name = i.ProductName,
            Quantity = i.Quantity,
            UnitPrice = i.UnitPrice,
            LineTotal = i.UnitPrice * i.Quantity,
            Details = i.Components.Select(c => c.ProductName).Where(n => n.Length > 0).ToList(),
            Note = i.Note,
            IsTakeaway = i.IsTakeaway,
        }).ToList();
    }
}
