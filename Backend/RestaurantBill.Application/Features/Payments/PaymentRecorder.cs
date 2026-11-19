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

/// <summary>Bir kalemin ürün indirimi: bu ödemede ödenen adetlerinin brütüne yüzde ya da tutar olarak.</summary>
public sealed record ItemDiscount(decimal? Percent, decimal? Amount);

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
        IReadOnlyDictionary<decimal, decimal> paidOnAccountByRate, PaymentDiscount discount,
        IReadOnlyDictionary<Guid, ItemDiscount>? itemDiscounts = null)
    {
        // Ürün indirimleri: kalemin bu ödemede ödenen adetlerinin brütüne uygulanır, kuruşa yuvarlanır.
        var lines = new List<Line>(paidItems.Count);
        foreach (var (item, quantity) in paidItems)
        {
            decimal gross = item.UnitPrice * quantity;
            decimal lineDiscount = 0m;
            decimal? linePercent = null;
            if (itemDiscounts?.GetValueOrDefault(item.Id) is ItemDiscount requested)
            {
                linePercent = requested.Percent;
                lineDiscount = requested.Percent.HasValue
                    ? Math.Round(gross * requested.Percent.Value / 100m, 2, MidpointRounding.AwayFromZero)
                    : requested.Amount ?? 0m;
                if (lineDiscount > gross)
                    return Result<(decimal, decimal)>.Failure($"{LineName(item)} için indirim ürün tutarından fazla olamaz.");
                if (lineDiscount > LimitOf(gross, discount.MaxPercent))
                    return Result<(decimal, decimal)>.Failure(StaffAccess.DiscountLimitMessage(discount.MaxPercent));
            }
            lines.Add(new Line(item, quantity, gross, lineDiscount, lineDiscount > 0m ? linePercent : null));
        }

        Dictionary<decimal, decimal> grossByRate = lines
            .GroupBy(l => l.Item.TaxRate)
            .ToDictionary(g => g.Key, g => g.Sum(l => l.Gross));
        Dictionary<decimal, decimal> creditByRate = PaymentAllocation.CreditByRate(grossByRate, paidOnAccountByRate);
        Dictionary<decimal, decimal> chargeByRate = grossByRate.ToDictionary(kv => kv.Key, kv => kv.Value - creditByRate[kv.Key]);
        decimal chargeTotal = chargeByRate.Values.Sum();

        // Hesaba alınmış ödemeler düşüldükten sonra bir oranda ürün indirimine yer kalmamışsa reddedilir.
        foreach (var group in lines.GroupBy(l => l.Item.TaxRate))
        {
            if (group.Sum(l => l.Discount) > chargeByRate[group.Key])
                return Result<(decimal, decimal)>.Failure("İskonto tutarı ödenecek toplam tutardan fazla olamaz.");
        }
        decimal itemDiscountTotal = lines.Sum(l => l.Discount);
        decimal chargeAfterItems = chargeTotal - itemDiscountTotal;

        // Hesap indirimi bu ödemede tahsil edilecek tutara (hesaba ödemeler ve ürün indirimleri düşüldükten sonra kalan) uygulanır.
        decimal billDiscount = discount.Percent.HasValue
            ? Math.Round(chargeAfterItems * discount.Percent.Value / 100m, 2, MidpointRounding.AwayFromZero)
            : discount.Amount ?? 0m;

        if (billDiscount > chargeAfterItems)
            return Result<(decimal, decimal)>.Failure("İskonto tutarı ödenecek toplam tutardan fazla olamaz.");

        // Kasiyerin indirim sınırı; tutarla girilen indirim, tahsil edilecek tutara oranlanır. Ürün indirimi de varsa
        // toplam indirim de tahsil edilecek tutarın sınırını aşamaz.
        decimal discountPercent = discount.Percent ?? (chargeAfterItems > 0m ? billDiscount * 100m / chargeAfterItems : 0m);
        if (discountPercent > discount.MaxPercent)
            return Result<(decimal, decimal)>.Failure(StaffAccess.DiscountLimitMessage(discount.MaxPercent));
        decimal discountAmount = itemDiscountTotal + billDiscount;
        if (itemDiscountTotal > 0m && discountAmount > LimitOf(chargeTotal, discount.MaxPercent))
            return Result<(decimal, decimal)>.Failure(StaffAccess.DiscountLimitMessage(discount.MaxPercent));

        // Oran başına bir Payment; ürün indirimi olan her kalem kendi Payment satırına yazılır ki ürün raporu indirimi
        // o ürüne düşsün (rapor indirimi satırın ödemesindeki ürünlere brütleriyle orantılı dağıtır).
        List<Bucket> buckets = [];
        foreach (var group in lines.GroupBy(l => l.Item.TaxRate).OrderBy(g => g.Key))
        {
            List<Line> plain = group.Where(l => l.Discount == 0m).ToList();
            List<Bucket> rateBuckets = group.Where(l => l.Discount > 0m).Select(l => new Bucket(group.Key, [l])).ToList();
            if (plain.Count > 0)
                rateBuckets.Insert(0, new Bucket(group.Key, plain));

            // Hesaba alınan pay, oranın kovalarına ürün indirimi düşülmüş tutarlarıyla orantılı dağılır.
            Dictionary<int, decimal> credit = PaymentAllocation.Split(creditByRate[group.Key],
                rateBuckets.Select((b, i) => (i, b.Gross - b.ItemDiscount)).ToDictionary(x => x.i, x => x.Item2));
            for (int i = 0; i < rateBuckets.Count; i++)
                rateBuckets[i].Credit = credit[i];
            buckets.AddRange(rateBuckets);
        }

        Dictionary<int, decimal> billDiscountByBucket = PaymentAllocation.Split(billDiscount,
            buckets.Select((b, i) => (i, b.Gross - b.ItemDiscount - b.Credit)).ToDictionary(x => x.i, x => x.Item2));

        decimal netTotal = 0m;
        for (int i = 0; i < buckets.Count; i++)
        {
            Bucket bucket = buckets[i];
            decimal bucketBillDiscount = billDiscountByBucket[i];
            decimal bucketDiscount = bucket.ItemDiscount + bucketBillDiscount;
            decimal bucketNetTotal = bucket.Gross - bucket.Credit - bucketDiscount;
            netTotal += bucketNetTotal;
            (decimal matrah, decimal taxAmount) = PaymentAllocation.SplitTax(bucketNetTotal, bucket.Rate);

            // Yüzde, satırın tek bir yüzde indirimi varsa yazılır: hesap yüzdesi (ürün indirimsiz satır) ya da ürünün yüzdesi.
            decimal? percent = bucket.ItemDiscount > 0m
                ? (bucketBillDiscount == 0m ? bucket.Lines[0].Percent : null)
                : discount.Percent;
            Payment payment = Payment.Create(order.Id, target.Register.Id, bucketNetTotal, matrah, taxAmount, target.Method, bucket.Lines.Sum(l => l.Quantity),
                bucketDiscount, bucketDiscount > 0m ? percent : discount.Percent, discount.Note, target.UserId, target.Shift.Id,
                taxRate: bucket.Rate, prepaidAmount: bucket.Credit);
            db.Payments.Add(payment);

            foreach (Line line in bucket.Lines)
                db.PaymentLineItems.Add(CreateLineItem(payment, line.Item, line.Quantity));
        }

        foreach (var (item, quantity) in paidItems)
            order.SettleItem(item.Id, quantity);

        return Result<(decimal, decimal)>.Success((netTotal, discountAmount));
    }

    // Sınır, yuvarlanmış indirimin kuruş farkıyla aşılmasın diye tutar olarak karşılaştırılır.
    private static decimal LimitOf(decimal amount, int maxPercent) =>
        maxPercent >= 100 ? amount : Math.Round(amount * maxPercent / 100m, 2, MidpointRounding.AwayFromZero);

    private sealed record Line(OrderItem Item, int Quantity, decimal Gross, decimal Discount, decimal? Percent);

    private sealed class Bucket(decimal rate, List<Line> lines)
    {
        public decimal Rate { get; } = rate;
        public List<Line> Lines { get; } = lines;
        public decimal Gross { get; } = lines.Sum(l => l.Gross);
        public decimal ItemDiscount { get; } = lines.Sum(l => l.Discount);
        public decimal Credit { get; set; }
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
