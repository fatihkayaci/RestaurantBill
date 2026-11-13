using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Payments.Commands.CreatePayment;

/// <summary>
/// Ödeme üç şekilde alınır:
/// <list type="bullet">
/// <item>Ürün seç / Tamamı: seçilen kalemler ödenir ve siparişten düşer (Order.SettleItem).</item>
/// <item>Tutar gir (kalandan az): ürüne bağlı olmayan "hesaba ödeme"; ürünler masada kalır, kalan tutar azalır.
/// Satır kalemi yazılmaz, tutar kalan hesabın KDV oranlarına orantılı dağıtılır.</item>
/// <item>Kapanış: hesaba ödeme alınmış siparişte kalanı kapatan ödeme ("Tamamı" ya da kalanın tamamı kadar tutar).
/// Kalan tüm ürünleri satır kalemi olarak taşır, daha önce hesaba alınanı oran başına düşer (PrepaidAmount).
/// Ürün adetleri raporlara böylece tek kez, kapanışta girer.</item>
/// </list>
/// Hesaba ödeme alınmış bir siparişte ürün seçerek kısmi ödeme alınmaz: kalan ya tutarla ya tamamıyla ödenir.
/// </summary>
public class CreatePaymentCommandHandler : IRequestHandler<CreatePaymentCommand, Result<bool>>
{
    private readonly IAppDbContext _db;
    private readonly ITableNotificationService _tableNotificationService;
    private readonly ICashierNotificationService _cashierNotificationService;
    private readonly ICurrentUserService _currentUserService;

    public CreatePaymentCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService)
    {
        _db = db;
        _tableNotificationService = tableNotificationService;
        _cashierNotificationService = cashierNotificationService;
        _currentUserService = currentUserService;
    }

    public async Task<Result<bool>> Handle(CreatePaymentCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUserService, cancellationToken);

        Order? order = await _db.Orders
            .Include(o => o.OrderItems).ThenInclude(i => i.Product).ThenInclude(p => p.Category)
            .InBranches(branchIds).FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);
        if (order is null)
            return Result<bool>.Failure("Böyle bir sipariş bulunamadı.");

        if (order.IsClosed())
            return Result<bool>.Failure("Bu sipariş kapanmış, ödeme alınamaz.");

        Table? table = await _db.Tables
            .FirstOrDefaultAsync(t => t.Id == order.TableId, cancellationToken);
        if (table is null)
            return Result<bool>.Failure("Böyle bir masa bulunamadı.");

        // Garson ödeme alabiliyorsa bile indirim/ikram ayrı yetkidir.
        StaffAccess access = await _db.GetStaffAccessAsync(_currentUserService, cancellationToken);
        bool hasDiscount = (request.DiscountPercent ?? 0m) > 0m || (request.DiscountAmount ?? 0m) > 0m;
        string? accessError = await _db.CheckTableAccessAsync(access, table.Id, WaiterPermission.TakePayment, cancellationToken)
            ?? (hasDiscount ? access.Check(WaiterPermission.CancelAndDiscount) : null);
        if (accessError is not null)
            return Result<bool>.Failure(accessError);

        CashRegister? register = await _db.CashRegisters
            .InBranches(branchIds).FirstOrDefaultAsync(c => c.Id == request.CashRegisterId, cancellationToken);
        if (register is null)
            return Result<bool>.Failure("Böyle bir kasa bulunamadı.");

        Guid orderBranchId = await _db.Regions
            .Where(r => r.Id == table.RegionId)
            .Select(r => r.BranchId)
            .FirstAsync(cancellationToken);
        if (register.BranchId != orderBranchId)
            return Result<bool>.Failure("Böyle bir kasa bulunamadı.");

        Shift? shift = await _db.Shifts
            .FirstOrDefaultAsync(s => s.CashRegisterId == register.Id && s.Status == ShiftStatus.Open, cancellationToken);
        if (shift is null)
            return Result<bool>.Failure(_currentUserService.Role == "Waiter"
                ? "Seçilen kasada açık gün yok, ödeme alınamıyor. Kasiyere ya da yöneticiye haber verin."
                : "Bu kasada açık bir vardiya yok, önce vardiyayı başlatın.");

        // Garson kendi kasası olmadan, şubedeki herhangi bir açık günlü kasaya ödeme alır: ödeme o kasanın
        // açık vardiyasına yazılır (gün sahibinin sayımına girer), Payment.UserId ise garsonu gösterir.

        // Vardiya kişiye ait: kasiyer sadece kendi vardiyasındaki kasaya ödeme alır ki kasa farkı
        // doğru kişiye yazılsın. Admin/Owner'ın aldığı ödeme Payment.UserId ile zaten ayrışır.
        if (_currentUserService.Role == "Cashier" && shift.OpenedByUserId != _currentUserService.UserId)
            return Result<bool>.Failure("Bu kasa başka birinin gününe atanmış. Kasayı size yöneticiniz atar.");

        // Ödenecek kalemler: tutar girilen ödemede kalanı kapatıyorsa tüm ürünler, değilse hiçbiri (hesaba ödeme).
        var paidItems = new List<(OrderItem Item, int Quantity)>();
        bool onAccount = false;
        if (request.Amount is decimal amount)
        {
            if (hasDiscount)
                return Result<bool>.Failure("Tutar girerek alınan ödemede indirim uygulanamaz. İndirimi kalan hesabı kapatırken uygulayın.");

            decimal remaining = order.RemainingAmount;
            if (order.OrderItems.Count == 0 || remaining <= 0m)
                return Result<bool>.Failure("Bu siparişte ödenecek tutar kalmadı.");

            if (amount > remaining)
                return Result<bool>.Failure($"Girilen tutar kalan tutardan (₺{remaining:0.##}) fazla olamaz.");

            if (amount < remaining)
                onAccount = true;
            else
                paidItems.AddRange(order.OrderItems.Select(i => (i, i.Quantity)));
        }
        else
        {
            foreach (var requested in request.Items)
            {
                OrderItem? item = order.OrderItems.FirstOrDefault(i => i.Id == requested.OrderItemId);
                if (item is null)
                    return Result<bool>.Failure("Ödenmek istenen bir ürün bu siparişte bulunamadı.");

                if (requested.Quantity > item.Quantity)
                    return Result<bool>.Failure($"{item.Product?.Name} için ödenmek istenen miktar siparişteki miktardan fazla.");

                paidItems.Add((item, requested.Quantity));
            }

            bool coversAllItems = order.OrderItems.All(i => paidItems.Any(p => p.Item.Id == i.Id && p.Quantity == i.Quantity));
            if (order.PaidOnAccount > 0m && !coversAllItems)
                return Result<bool>.Failure("Bu hesaptan tutar girilerek ödeme alınmış; artık ürün seçerek ödeme alınamaz. Kalanı \"Tamamı\" ya da \"Tutar gir\" ile alın.");
        }

        // IBAN ile ödeme yalnızca şubede IBAN tanımlıysa alınır; kasaya nakit girmez (kart gibi).
        if (request.PaymentMethod == PaymentMethod.Iban)
        {
            bool branchHasIban = await _db.Branches
                .AnyAsync(b => b.Id == register.BranchId && b.Iban != string.Empty, cancellationToken);
            if (!branchHasIban)
                return Result<bool>.Failure("Şubede IBAN tanımlı değil. Restoran ayarlarından IBAN ekleyin.");
        }

        // Daha önce hesaba alınmış ödemelerin KDV oranı başına toplamı (kapanışta düşülür, yeni hesaba ödemede
        // kalan payın oranlara dağılımını belirler).
        Dictionary<decimal, decimal> paidOnAccountByRate = order.PaidOnAccount > 0m
            ? (await _db.Payments
                .Where(p => p.OrderId == order.Id && p.IsOnAccount)
                .Select(p => new { p.TaxRate, p.TotalAmount })
                .ToListAsync(cancellationToken))
                .GroupBy(p => p.TaxRate)
                .ToDictionary(g => g.Key, g => g.Sum(p => p.TotalAmount))
            : [];

        decimal netTotal;
        decimal discountAmount = 0m;
        if (onAccount)
        {
            netTotal = request.Amount!.Value;
            RecordOnAccountPayment(order, register, shift, request.PaymentMethod, netTotal, paidOnAccountByRate);
        }
        else
        {
            Dictionary<decimal, decimal> grossByRate = paidItems
                .GroupBy(p => p.Item.TaxRate)
                .ToDictionary(g => g.Key, g => g.Sum(p => p.Item.UnitPrice * p.Quantity));
            Dictionary<decimal, decimal> creditByRate = PaymentAllocation.CreditByRate(grossByRate, paidOnAccountByRate);
            Dictionary<decimal, decimal> chargeByRate = grossByRate.ToDictionary(kv => kv.Key, kv => kv.Value - creditByRate[kv.Key]);
            decimal chargeTotal = chargeByRate.Values.Sum();

            // İndirim bu ödemede tahsil edilecek tutara (hesaba ödemeler düşüldükten sonra kalan) uygulanır.
            discountAmount = request.DiscountPercent.HasValue
                ? Math.Round(chargeTotal * request.DiscountPercent.Value / 100m, 2, MidpointRounding.AwayFromZero)
                : request.DiscountAmount ?? 0m;

            if (discountAmount > chargeTotal)
                return Result<bool>.Failure("İskonto tutarı ödenecek toplam tutardan fazla olamaz.");

            netTotal = chargeTotal - discountAmount;
            Dictionary<decimal, decimal> discountByRate = PaymentAllocation.Split(discountAmount, chargeByRate);

            foreach (var group in paidItems.GroupBy(p => p.Item.TaxRate).OrderBy(g => g.Key))
            {
                decimal rate = group.Key;
                decimal groupDiscount = discountByRate[rate];
                decimal groupNetTotal = chargeByRate[rate] - groupDiscount;
                (decimal groupMatrah, decimal groupTaxAmount) = PaymentAllocation.SplitTax(groupNetTotal, rate);

                int groupItemCount = group.Sum(p => p.Quantity);
                Payment payment = Payment.Create(order.Id, register.Id, groupNetTotal, groupMatrah, groupTaxAmount, request.PaymentMethod, groupItemCount,
                    groupDiscount, request.DiscountPercent, request.DiscountNote, _currentUserService.UserId, shift.Id,
                    taxRate: rate, prepaidAmount: creditByRate[rate]);
                _db.Payments.Add(payment);

                foreach (var (item, quantity) in group)
                {
                    PaymentLineItem lineItem = PaymentLineItem.Create(
                        payment, item.ProductId, item.Product?.Name ?? string.Empty,
                        item.Product?.CategoryId ?? Guid.Empty, item.Product?.Category?.Name ?? string.Empty,
                        item.UnitPrice, quantity, item.TaxRate);
                    _db.PaymentLineItems.Add(lineItem);
                }
            }

            foreach (var (item, quantity) in paidItems)
                order.SettleItem(item.Id, quantity);
        }

        // Tamamı ikram (net 0) kasaya nakit hareketi yazmaz.
        if (request.PaymentMethod == PaymentMethod.Nakit && netTotal > 0)
        {
            CashTransaction transaction = register.AddTransaction(CashTransactionType.In, netTotal, _currentUserService.UserId);
            _db.CashTransactions.Add(transaction);
        }

        bool fullyPaid = !onAccount && order.OrderItems.Count == 0;
        if (fullyPaid)
        {
            order.Close();
            table.Release();
        }

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUserService.UserId, cancellationToken);
        string discountLogFragment = discountAmount > 0 ? $" (₺{discountAmount} iskonto uygulandı)" : string.Empty;
        string message = fullyPaid
            ? $"{actor?.FullName} {table.Name} siparişini {MethodLabel(request.PaymentMethod)} ile kapattı (₺{netTotal}).{discountLogFragment}"
            : onAccount
                ? $"{actor?.FullName} {table.Name} hesabından {MethodLabel(request.PaymentMethod)} ile ₺{netTotal} tutarında ödeme aldı (kalan ₺{order.RemainingAmount})."
                : $"{actor?.FullName} {table.Name} siparişinden {MethodLabel(request.PaymentMethod)} ile ₺{netTotal} tutarında kısmi ödeme aldı.{discountLogFragment}";
        AuditLog log = AuditLog.Create(
            _currentUserService.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.Payment,
            AuditLogSeverity.Info,
            "OrderPaid",
            message,
            nameof(Order),
            order.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);

        if (fullyPaid)
        {
            await _tableNotificationService.SendTableStatusChangedAsync(_currentUserService.BranchId, table.Id, (int)table.Status);
            await _tableNotificationService.SendOrderClosedAsync(_currentUserService.BranchId, table.Id, order.Id);
        }
        else
        {
            await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, table.Id, order.TotalPrice, actor?.FullName ?? string.Empty);
        }
        await _cashierNotificationService.SendOrdersChangedAsync(_currentUserService.BranchId);

        return Result<bool>.Success(fullyPaid);
    }

    // Hesaba ödeme: ürün düşmez; tutar kalan hesabın KDV oranlarına orantılı dağıtılır, oran başına bir satır.
    private void RecordOnAccountPayment(Order order, CashRegister register, Shift shift, PaymentMethod method, decimal amount,
        IReadOnlyDictionary<decimal, decimal> paidOnAccountByRate)
    {
        Dictionary<decimal, decimal> grossByRate = order.OrderItems
            .GroupBy(i => i.TaxRate)
            .ToDictionary(g => g.Key, g => g.Sum(i => i.UnitPrice * i.Quantity));
        Dictionary<decimal, decimal> creditByRate = PaymentAllocation.CreditByRate(grossByRate, paidOnAccountByRate);
        Dictionary<decimal, decimal> remainingByRate = grossByRate.ToDictionary(kv => kv.Key, kv => kv.Value - creditByRate[kv.Key]);

        foreach ((decimal rate, decimal share) in PaymentAllocation.Split(amount, remainingByRate).OrderBy(kv => kv.Key))
        {
            if (share <= 0m)
                continue;

            (decimal matrah, decimal tax) = PaymentAllocation.SplitTax(share, rate);
            Payment payment = Payment.Create(order.Id, register.Id, share, matrah, tax, method, 0,
                userId: _currentUserService.UserId, shiftId: shift.Id, taxRate: rate, isOnAccount: true);
            _db.Payments.Add(payment);
        }

        order.PayOnAccount(amount);
    }

    private static string MethodLabel(PaymentMethod method) => method switch
    {
        PaymentMethod.Kart => "kart",
        PaymentMethod.Nakit => "nakit",
        PaymentMethod.Qr => "QR",
        PaymentMethod.Iban => "IBAN",
        _ => method.ToString(),
    };
}
