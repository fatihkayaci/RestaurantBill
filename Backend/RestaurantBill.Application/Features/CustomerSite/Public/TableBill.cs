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
// Masanın açık hesabı, masanın QR'ını açan her telefonda görünür: garsonun eklediği ürünler ve menüler dahil, adet,
// fiyat, ödenen ve kalan. Masadaki herkes aynı hesabı paylaşır.
//
// Hesap ödenip kapanınca masa yeni misafirlere açılır. Kapanan hesap bir süre (PaidBillVisibleFor) "Ödendi" olarak
// yalnız o hesaba QR talebi yazılan telefonlarda görünür (OrderRequest.OrderId + DeviceTokenHash); diğer ve yeni
// telefonlar "açık hesap yok" görür, böylece önceki misafirlerin hesabı sonrakilere gösterilmez. Ödenen kalemler ödeme
// satırlarından (PaymentLineItem) okunur, çünkü ödenen sipariş kalemi hesaptan silinir. İptal edilen hesap gösterilmez.
public class GetTableBillQuery : IRequest<Result<PublicTableBillDto>>
{
    public Guid TableId { get; set; }
    /// <summary>Telefonun cihaz anahtarının özeti (X-Device-Token → QrTableAccess.HashToken); yalnız ödenen hesap için okunur.</summary>
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
    /// <summary>Kapanan hesap, kapandıktan sonra bu süre boyunca katılan telefonlarda "Ödendi" olarak görünür.</summary>
    public static readonly TimeSpan PaidBillVisibleFor = TimeSpan.FromHours(3);

    /// <summary>Açık hesap yokken bekleyen talepler gönderildikten sonra bu süre boyunca listelenir (önceki misafirin
    /// bekleyen talebi yeni oturana sonsuza kadar görünmesin).</summary>
    public static readonly TimeSpan PendingRequestsVisibleFor = TimeSpan.FromMinutes(30);

    public async Task<Result<PublicTableBillDto>> Handle(GetTableBillQuery request, CancellationToken cancellationToken)
    {
        Table? table = await CustomerSiteScope.ResolveTableAsync(db, tenant, request.TableId, cancellationToken);
        if (table is null)
            return Result<PublicTableBillDto>.Failure(CustomerSiteScope.TableNotFoundMessage);

        Order? order = await WithItems(db.Orders.AsNoTracking())
            .Where(o => o.TableId == table.Id && o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        string? tokenHash = request.DeviceTokenHash;
        Order? paidOrder = tokenHash is null ? null : await FindRecentPaidOrderAsync(table.Id, tokenHash, cancellationToken);
        DateTime? paidAt = paidOrder is null ? null : PaidAtOf(paidOrder);

        // Masada açık hesap var: masadaki her telefon görür. Telefonun önceki (ödenen) hesabının kapanış anı da gider ki
        // telefon o andan önce onaylanan taleplerini "Ödendi" gösterebilsin.
        PublicTableBillDto bill = order is not null ? OpenBill(order, paidAt)
            // Bu telefonun katıldığı, az önce ödenen hesap.
            : paidOrder is not null ? await PaidBillAsync(paidOrder, paidAt!.Value, cancellationToken)
            : new PublicTableBillDto { HasBill = false };

        // Sayfa hesabı yoklarken personelin QR kilidini de buradan öğrenir (ayrı yoklama yok).
        bill.QrOrderingLocked = table.QrOrderingLocked;
        bill.PendingRequests = await PendingRequestsAsync(table.Id, hasOpenBill: order is not null, tokenHash, cancellationToken);
        return Result<PublicTableBillDto>.Success(bill);
    }

    // Masadaki diğer telefonların bekleyen siparişleri yalnız bilgi olarak: zaman ve adet (ürün adı yok). Aynı ürünü iki
    // kişinin sipariş etmesi engellenmez. Açık hesap yoksa yalnız son 30 dakikadakiler (gizlilik).
    private async Task<List<PublicPendingRequestDto>> PendingRequestsAsync(Guid tableId, bool hasOpenBill, string? tokenHash, CancellationToken cancellationToken)
    {
        DateTime since = clock.GetUtcNow().UtcDateTime - PendingRequestsVisibleFor;
        var rows = await db.OrderRequests.AsNoTracking()
            .Where(r => r.TableId == tableId && r.Status == OrderRequestStatus.Pending && r.Kind == OrderRequestKind.TableQr
                && (hasOpenBill || r.CreatedAt >= since))
            .OrderBy(r => r.CreatedAt)
            .Select(r => new { r.CreatedAt, ItemCount = r.Items.Sum(i => i.Quantity), r.DeviceTokenHash })
            .ToListAsync(cancellationToken);

        return rows.Select(r => new PublicPendingRequestDto
        {
            SentAt = r.CreatedAt,
            ItemCount = r.ItemCount,
            IsMine = tokenHash is not null && r.DeviceTokenHash == tokenHash,
        }).ToList();
    }

    private static IQueryable<Order> WithItems(IQueryable<Order> query)
        => query
            .Include(o => o.OrderItems).ThenInclude(i => i.Product)
            .Include(o => o.OrderItems).ThenInclude(i => i.SetMenu);

    // Kapanan sipariş en son kapanışta değişir; UpdatedAt kayıtta (SaveChanges) yazılır.
    private static DateTime PaidAtOf(Order order) => order.UpdatedAt ?? order.CreatedAt;

    /// <summary>Bu telefonun QR talebi yazılan, masada en son ödenen ve görünme süresi dolmamış hesap.</summary>
    private Task<Order?> FindRecentPaidOrderAsync(Guid tableId, string tokenHash, CancellationToken cancellationToken)
    {
        DateTime since = clock.GetUtcNow().UtcDateTime - PaidBillVisibleFor;
        return WithItems(db.Orders.AsNoTracking())
            .Where(o => o.TableId == tableId && o.Status == OrderStatus.Paid && (o.UpdatedAt ?? o.CreatedAt) >= since
                && db.OrderRequests.Any(r => r.OrderId == o.Id && r.Kind == OrderRequestKind.TableQr && r.DeviceTokenHash == tokenHash))
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
