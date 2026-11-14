using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Payments;

/// <summary>Ödemenin yazılacağı kasa ve vardiya, yöntem ve ödemeyi alan kişi (Payment.UserId).</summary>
public sealed record PaymentTarget(CashRegister Register, Shift Shift, PaymentMethod Method, Guid UserId);

/// <summary>İndirim isteği. Yüzde ve tutar birlikte verilmez (doğrulayıcı reddeder).</summary>
public sealed record PaymentDiscount(decimal? Percent, decimal? Amount, string? Note, int MaxPercent)
{
    public static readonly PaymentDiscount None = new(null, null, null, 100);
}

/// <summary>
/// Ödeme satırlarını yazar: KDV oranı başına bir Payment, satır kalemleri (menüler dahil), indirimin oranlara dağılımı,
/// hesaba ödemelerin mahsubu, teslimat ücreti satırı ve nakit için kasa hareketi. Kaydetmez; çağıran tek SaveChanges yapar.
/// Ödeme ekranı (CreatePayment) ve kuryeden tahsilat teslim alma ("Teslim al") bunu kullanır.
/// </summary>
public sealed class PaymentRecorder(IAppDbContext db)
{
    public const string SetMenuReportCategoryName = "Menüler";

    /// <summary>Hesapta görünen satırlar: tek ürünler ve menü satırları. Menünün içindeki ürünler (0 ₺) menüyle birlikte ödenir.</summary>
    public static IEnumerable<OrderItem> BillLines(Order order) => order.OrderItems.Where(i => !i.IsSetMenuComponent);

    public static string LineName(OrderItem item) => item.SetMenu?.Name ?? item.Product?.Name ?? string.Empty;

    /// <summary>Daha önce hesaba alınmış ödemelerin KDV oranı başına toplamı; hesaba ödeme yoksa boş.</summary>
    public async Task<Dictionary<decimal, decimal>> PaidOnAccountByRateAsync(Order order, CancellationToken cancellationToken)
        => order.PaidOnAccount > 0m
            ? (await db.Payments
                .Where(p => p.OrderId == order.Id && p.IsOnAccount)
                .Select(p => new { p.TaxRate, p.TotalAmount })
                .ToListAsync(cancellationToken))
                .GroupBy(p => p.TaxRate)
                .ToDictionary(g => g.Key, g => g.Sum(p => p.TotalAmount))
            : [];

    /// <summary>
    /// Seçilen kalemleri öder ve siparişten düşer. Hesaba alınmış ödemeler oran başına mahsup edilir, indirim tahsil
    /// edilecek tutara uygulanır. İndirim hatasında hiçbir şey yazılmaz. Başarıda net tutar ve indirim döner.
    /// </summary>
    public Result<(decimal NetTotal, decimal DiscountAmount)> RecordItems(
        Order order, IReadOnlyList<(OrderItem Item, int Quantity)> paidItems, PaymentTarget target,
        IReadOnlyDictionary<decimal, decimal> paidOnAccountByRate, PaymentDiscount discount)
    {
        Dictionary<decimal, decimal> grossByRate = paidItems
            .GroupBy(p => p.Item.TaxRate)
            .ToDictionary(g => g.Key, g => g.Sum(p => p.Item.UnitPrice * p.Quantity));
        Dictionary<decimal, decimal> creditByRate = PaymentAllocation.CreditByRate(grossByRate, paidOnAccountByRate);
        Dictionary<decimal, decimal> chargeByRate = grossByRate.ToDictionary(kv => kv.Key, kv => kv.Value - creditByRate[kv.Key]);
        decimal chargeTotal = chargeByRate.Values.Sum();

        // İndirim bu ödemede tahsil edilecek tutara (hesaba ödemeler düşüldükten sonra kalan) uygulanır.
        decimal discountAmount = discount.Percent.HasValue
            ? Math.Round(chargeTotal * discount.Percent.Value / 100m, 2, MidpointRounding.AwayFromZero)
            : discount.Amount ?? 0m;

        if (discountAmount > chargeTotal)
            return Result<(decimal, decimal)>.Failure("İskonto tutarı ödenecek toplam tutardan fazla olamaz.");

        // Kasiyerin indirim sınırı; tutarla girilen indirim, tahsil edilecek tutara oranlanır.
        decimal discountPercent = discount.Percent ?? (chargeTotal > 0m ? discountAmount * 100m / chargeTotal : 0m);
        if (discountPercent > discount.MaxPercent)
            return Result<(decimal, decimal)>.Failure(StaffAccess.DiscountLimitMessage(discount.MaxPercent));

        decimal netTotal = chargeTotal - discountAmount;
        Dictionary<decimal, decimal> discountByRate = PaymentAllocation.Split(discountAmount, chargeByRate);

        foreach (var group in paidItems.GroupBy(p => p.Item.TaxRate).OrderBy(g => g.Key))
        {
            decimal rate = group.Key;
            decimal groupDiscount = discountByRate[rate];
            decimal groupNetTotal = chargeByRate[rate] - groupDiscount;
            (decimal groupMatrah, decimal groupTaxAmount) = PaymentAllocation.SplitTax(groupNetTotal, rate);

            int groupItemCount = group.Sum(p => p.Quantity);
            Payment payment = Payment.Create(order.Id, target.Register.Id, groupNetTotal, groupMatrah, groupTaxAmount, target.Method, groupItemCount,
                groupDiscount, discount.Percent, discount.Note, target.UserId, target.Shift.Id,
                taxRate: rate, prepaidAmount: creditByRate[rate]);
            db.Payments.Add(payment);

            foreach (var (item, quantity) in group)
                db.PaymentLineItems.Add(CreateLineItem(payment, item, quantity));
        }

        foreach (var (item, quantity) in paidItems)
            order.SettleItem(item.Id, quantity);

        return Result<(decimal, decimal)>.Success((netTotal, discountAmount));
    }

    /// <summary>Hesaba ödeme: ürün düşmez; tutar kalan hesabın KDV oranlarına orantılı dağıtılır, oran başına bir satır.</summary>
    public void RecordOnAccount(Order order, PaymentTarget target, decimal amount, IReadOnlyDictionary<decimal, decimal> paidOnAccountByRate)
    {
        Dictionary<decimal, decimal> grossByRate = BillLines(order)
            .GroupBy(i => i.TaxRate)
            .ToDictionary(g => g.Key, g => g.Sum(i => i.UnitPrice * i.Quantity));
        Dictionary<decimal, decimal> creditByRate = PaymentAllocation.CreditByRate(grossByRate, paidOnAccountByRate);
        Dictionary<decimal, decimal> remainingByRate = grossByRate.ToDictionary(kv => kv.Key, kv => kv.Value - creditByRate[kv.Key]);

        foreach ((decimal rate, decimal share) in PaymentAllocation.Split(amount, remainingByRate).OrderBy(kv => kv.Key))
        {
            if (share <= 0m)
                continue;

            (decimal matrah, decimal tax) = PaymentAllocation.SplitTax(share, rate);
            Payment payment = Payment.Create(order.Id, target.Register.Id, share, matrah, tax, target.Method, 0,
                userId: target.UserId, shiftId: target.Shift.Id, taxRate: rate, isOnAccount: true);
            db.Payments.Add(payment);
        }

        order.PayOnAccount(amount);
    }

    /// <summary>
    /// Paket siparişin teslimat ücreti: satır kalemi olmayan ayrı bir ödeme (IsDeliveryFee), verilen KDV oranıyla
    /// (şubenin oranı). Ürün raporuna girmez; satış, vardiya ve KDV raporlarına ödeme olarak girer. Ücret yoksa 0 döner.
    /// </summary>
    public decimal RecordDeliveryFee(Order order, PaymentTarget target, decimal taxRate)
    {
        if (order.DeliveryFee <= 0m || order.DeliveryFeeSettled)
            return 0m;

        decimal fee = order.DeliveryFee;
        (decimal matrah, decimal tax) = PaymentAllocation.SplitTax(fee, taxRate);
        db.Payments.Add(Payment.Create(order.Id, target.Register.Id, fee, matrah, tax, target.Method, 0,
            userId: target.UserId, shiftId: target.Shift.Id, taxRate: taxRate, isDeliveryFee: true));
        order.SettleDeliveryFee();
        return fee;
    }

    /// <summary>Nakit tahsilat kasaya giriş hareketi yazar; diğer yöntemler ve 0 ₺ (tamamı ikram) yazmaz.</summary>
    public void RecordCashIn(CashRegister register, PaymentMethod method, decimal amount, Guid userId)
    {
        if (method != PaymentMethod.Nakit || amount <= 0)
            return;

        db.CashTransactions.Add(register.AddTransaction(CashTransactionType.In, amount, userId));
    }

    // Menü raporda tek satırdır (menünün adı ve gösterim kategorisi); kategorisi yoksa "Menüler" altında toplanır.
    private static PaymentLineItem CreateLineItem(Payment payment, OrderItem item, int quantity)
    {
        if (item.SetMenu is SetMenu setMenu)
            return PaymentLineItem.CreateForSetMenu(
                payment, setMenu.Id, setMenu.Name,
                setMenu.CategoryId ?? Guid.Empty, setMenu.Category?.Name ?? SetMenuReportCategoryName,
                item.UnitPrice, quantity, item.TaxRate);

        return PaymentLineItem.Create(
            payment, item.ProductId ?? Guid.Empty, item.Product?.Name ?? string.Empty,
            item.Product?.CategoryId ?? Guid.Empty, item.Product?.Category?.Name ?? string.Empty,
            item.UnitPrice, quantity, item.TaxRate);
    }
}
