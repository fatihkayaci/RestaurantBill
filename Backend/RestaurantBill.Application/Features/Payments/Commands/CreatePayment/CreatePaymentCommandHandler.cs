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
    private readonly PaymentRecorder _recorder;

    public CreatePaymentCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService)
    {
        _db = db;
        _tableNotificationService = tableNotificationService;
        _cashierNotificationService = cashierNotificationService;
        _currentUserService = currentUserService;
        _recorder = new PaymentRecorder(db);
    }

    public async Task<Result<bool>> Handle(CreatePaymentCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUserService, cancellationToken);

        Order? order = await _db.Orders
            .Include(o => o.OrderItems).ThenInclude(i => i.Product).ThenInclude(p => p!.Category)
            .Include(o => o.OrderItems).ThenInclude(i => i.SetMenu).ThenInclude(s => s!.Category)
            .InBranches(branchIds).FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);
        if (order is null)
            return Result<bool>.Failure("Böyle bir sipariş bulunamadı.");

        if (order.IsClosed())
            return Result<bool>.Failure("Bu sipariş kapanmış, ödeme alınamaz.");

        // Paket siparişin tahsilatı kuryeden teslim alınırken kaydedilir (online siparişler), bu ekrandan değil.
        if (!order.HasTable)
            return Result<bool>.Failure(Order.TableOnlyMessage);

        Table? table = await _db.Tables
            .FirstOrDefaultAsync(t => t.Id == order.TableId, cancellationToken);
        if (table is null)
            return Result<bool>.Failure("Böyle bir masa bulunamadı.");

        // Garson ödeme alabiliyorsa bile indirim/ikram ayrı yetkidir; kasiyerde de indirim/ikram ayrı yetkidir.
        StaffAccess access = await _db.GetStaffAccessAsync(_currentUserService, cancellationToken);
        bool hasDiscount = (request.DiscountPercent ?? 0m) > 0m || (request.DiscountAmount ?? 0m) > 0m;
        string? accessError = await _db.CheckTableAccessAsync(access, table.Id, WaiterPermission.TakePayment, cancellationToken)
            ?? (hasDiscount ? access.Check(WaiterPermission.CancelAndDiscount) ?? access.Check(CashierPermission.ApplyDiscount) : null);
        if (accessError is not null)
            return Result<bool>.Failure(accessError);

        CashRegister? register = await _db.CashRegisters
            .InBranches(branchIds).FirstOrDefaultAsync(c => c.Id == request.CashRegisterId, cancellationToken);
        if (register is null)
            return Result<bool>.Failure("Böyle bir kasa bulunamadı.");

        if (register.BranchId != order.BranchId)
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
                paidItems.AddRange(BillLines(order).Select(i => (i, i.Quantity)));
        }
        else
        {
            foreach (var requested in request.Items)
            {
                OrderItem? item = order.OrderItems.FirstOrDefault(i => i.Id == requested.OrderItemId);
                if (item is null)
                    return Result<bool>.Failure("Ödenmek istenen bir ürün bu siparişte bulunamadı.");

                if (item.IsSetMenuComponent)
                    return Result<bool>.Failure("Menüdeki bir ürün ayrı ödenemez; menü satırını seçin.");

                if (requested.Quantity > item.Quantity)
                    return Result<bool>.Failure($"{LineName(item)} için ödenmek istenen miktar siparişteki miktardan fazla.");

                paidItems.Add((item, requested.Quantity));
            }

            bool coversAllItems = BillLines(order).All(i => paidItems.Any(p => p.Item.Id == i.Id && p.Quantity == i.Quantity));
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
        Dictionary<decimal, decimal> paidOnAccountByRate = await _recorder.PaidOnAccountByRateAsync(order, cancellationToken);
        var target = new PaymentTarget(register, shift, request.PaymentMethod, _currentUserService.UserId);

        decimal netTotal;
        decimal discountAmount = 0m;
        if (onAccount)
        {
            netTotal = request.Amount!.Value;
            _recorder.RecordOnAccount(order, target, netTotal, paidOnAccountByRate);
        }
        else
        {
            var recorded = _recorder.RecordItems(order, paidItems, target, paidOnAccountByRate,
                new PaymentDiscount(request.DiscountPercent, request.DiscountAmount, request.DiscountNote, access.MaxDiscountPercent));
            if (recorded.IsFailure)
                return Result<bool>.Failure(recorded.Error!);
            (netTotal, discountAmount) = recorded.Value;
        }

        // Tamamı ikram (net 0) kasaya nakit hareketi yazmaz.
        _recorder.RecordCashIn(register, request.PaymentMethod, netTotal, _currentUserService.UserId);

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

    private static IEnumerable<OrderItem> BillLines(Order order) => PaymentRecorder.BillLines(order);

    private static string LineName(OrderItem item) => PaymentRecorder.LineName(item);

    private static string MethodLabel(PaymentMethod method) => method switch
    {
        PaymentMethod.Kart => "kart",
        PaymentMethod.Nakit => "nakit",
        PaymentMethod.Qr => "QR",
        PaymentMethod.Iban => "IBAN",
        _ => method.ToString(),
    };
}
