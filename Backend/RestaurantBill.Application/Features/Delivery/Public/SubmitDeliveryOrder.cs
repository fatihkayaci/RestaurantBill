using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Delivery.Public;

/// <summary>
/// Müşteri paket siparişi gönderir. Fiyat sunucuda yeniden hesaplanır; istemcinin gördüğü toplam (ExpectedTotal)
/// tutmazsa sipariş açılmaz, güncel teklif döner (409). Sipariş personel kabul edene kadar mutfağa gitmez.
/// </summary>
public class SubmitDeliveryOrderCommand : IRequest<Result<SubmitDeliveryOrderResultDto>>
{
    public Guid? BranchId { get; set; }
    /// <summary>İstemcinin sepet başına ürettiği anahtar; aynı anahtarla tekrar gönderim aynı siparişi döner.</summary>
    public Guid ClientRequestId { get; set; }
    /// <summary>Gel al: müşteri restorandan alır; bölge ve adres istenmez, teslimat ücreti yoktur.</summary>
    public bool Pickup { get; set; }
    /// <summary>Yalnızca adrese teslimde zorunlu.</summary>
    public Guid ZoneId { get; set; }
    public List<CartLineInput> Lines { get; set; } = [];
    public string CustomerName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? AddressDirections { get; set; }
    public string? Note { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public decimal ExpectedTotal { get; set; }
    /// <summary>Bal küpü: formda gizli alan, insan doldurmaz. Doluysa istek botsa sayılır.</summary>
    public string? Website { get; set; }
    /// <summary>Şube telefon doğrulaması istiyorsa (ve SMS yapılandırılmışsa) zorunlu.</summary>
    public string? VerificationToken { get; set; }
}

public class SubmitDeliveryOrderCommandValidator : AbstractValidator<SubmitDeliveryOrderCommand>
{
    public SubmitDeliveryOrderCommandValidator()
    {
        RuleFor(x => x.ClientRequestId).NotEqual(Guid.Empty).WithMessage("Geçersiz istek. Sayfayı yenileyip tekrar deneyin.");
        RuleFor(x => x.ZoneId).NotEqual(Guid.Empty).When(x => !x.Pickup).WithMessage("Teslimat bölgenizi seçin.");
        RuleFor(x => x.Lines).CartRules();
        RuleFor(x => x.CustomerName)
            .NotEmpty().WithMessage("Adınızı ve soyadınızı girin.")
            .MaximumLength(DeliveryOrder.NameMaxLength).WithMessage($"Ad soyad en fazla {DeliveryOrder.NameMaxLength} karakter olabilir.");
        RuleFor(x => x.Phone)
            .Must(TurkishPhone.IsValid).WithMessage("Geçerli bir telefon numarası girin.");
        RuleFor(x => x.Address)
            .NotEmpty().When(x => !x.Pickup).WithMessage("Adresinizi girin.")
            .MaximumLength(DeliveryOrder.AddressMaxLength).WithMessage($"Adres en fazla {DeliveryOrder.AddressMaxLength} karakter olabilir.");
        RuleFor(x => x.AddressDirections)
            .MaximumLength(DeliveryOrder.DirectionsMaxLength).WithMessage($"Adres tarifi en fazla {DeliveryOrder.DirectionsMaxLength} karakter olabilir.");
        RuleFor(x => x.Note)
            .MaximumLength(DeliveryOrder.NoteMaxLength).WithMessage($"Sipariş notu en fazla {DeliveryOrder.NoteMaxLength} karakter olabilir.");
        RuleFor(x => x.PaymentMethod)
            .Must(m => m is PaymentMethod.Nakit or PaymentMethod.Kart or PaymentMethod.Iban).WithMessage("Ödeme yöntemini seçin.");
    }
}

public class SubmitDeliveryOrderCommandHandler(
    IAppDbContext db,
    ITenantResolver tenant,
    IOrderPricingService pricing,
    ISmsSender sms,
    IClientInfo client,
    ICashierNotificationService cashierNotifications,
    TimeProvider clock)
    : IRequestHandler<SubmitDeliveryOrderCommand, Result<SubmitDeliveryOrderResultDto>>
{
    public const string HoneypotMessage = "Sipariş alınamadı. Lütfen sayfayı yenileyip tekrar deneyin.";
    public const string VerificationRequiredMessage = "Siparişi göndermek için telefon numaranızı doğrulayın.";
    public const string VerificationInvalidMessage = "Telefon doğrulaması geçersiz, tekrar doğrulayın.";
    public const string PendingPerIpMessage = "Onay bekleyen siparişleriniz var. Restoran yanıtladıktan sonra yeni sipariş verebilirsiniz.";
    public const string IbanNotAcceptedMessage = "Bu restoran şu an IBAN ile ödeme almıyor; başka bir ödeme yöntemi seçin.";
    public const string DailyLimitMessage = "Bu numarayla bugün verilebilecek online sipariş sınırına ulaşıldı. Lütfen restoranı arayın.";

    public async Task<Result<SubmitDeliveryOrderResultDto>> Handle(SubmitDeliveryOrderCommand request, CancellationToken cancellationToken)
    {
        // Bot: hiçbir şey yazılmaz, hangi alanın ele verdiği söylenmez.
        if (!string.IsNullOrWhiteSpace(request.Website))
            return Fail(HoneypotMessage);

        var (company, branch, _) = await PublicDeliveryContext.ResolveAsync(db, tenant, request.BranchId, cancellationToken);
        if (company is null || branch is null)
            return Fail(DeliveryScope.RestaurantNotFoundMessage);

        // Aynı sepetin tekrar gönderimi (çift tıklama, bağlantı kopması): ilk sipariş döner, sınırlar yeniden sayılmaz.
        if (await FindExistingAsync(branch.Id, request.ClientRequestId, cancellationToken) is { } existing)
            return Ok(existing);

        string phone = TurkishPhone.Normalize(request.Phone);
        if (phone.Length == 0)
            return Fail("Geçerli bir telefon numarası girin.");

        BlockedPhone? blocked = await db.BlockedPhones
            .FirstOrDefaultAsync(b => b.BranchId == branch.Id && b.Phone == phone && !b.IsDeleted, cancellationToken);
        if (blocked is not null)
        {
            // Engelli numaranın denemesi sayılır (Ayarlar → Engelli numaralar'da görünür); müşteriye yine aynı mesaj.
            blocked.RegisterBlockedAttempt(clock.GetUtcNow().UtcDateTime);
            await db.SaveChangesAsync(cancellationToken);
            return Fail(BlockedPhone.CustomerMessage);
        }

        DateTime now = clock.GetUtcNow().UtcDateTime;
        DeliveryScope.Availability availability = DeliveryScope.AvailabilityOf(branch, now);
        if (!availability.IsOpen)
            return Fail(availability.Message);

        OnlineOrderSettings settings = branch.GetOnlineOrderSettings();
        if (!DeliveryScope.PaymentMethodsOf(branch).Contains(request.PaymentMethod))
            return Fail(request.PaymentMethod switch
            {
                PaymentMethod.Nakit => "Bu restoran kapıda nakit ödeme almıyor; başka bir ödeme yöntemi seçin.",
                PaymentMethod.Iban => IbanNotAcceptedMessage,
                _ => "Bu restoran kapıda kartla ödeme almıyor; başka bir ödeme yöntemi seçin."
            });

        // Gel al: bölge, teslimat ücreti ve bölgenin en az tutarı yoktur (en az tutar kurye maliyeti içindir).
        DeliveryZone? zone = null;
        if (request.Pickup)
        {
            if (!branch.OffersPickup)
                return Fail(DeliveryScope.PickupDisabledMessage);
        }
        else
        {
            zone = await db.DeliveryZones.AsNoTracking()
                .FirstOrDefaultAsync(z => z.Id == request.ZoneId && z.BranchId == branch.Id && z.IsActive && !z.IsDeleted, cancellationToken);
            if (zone is null)
                return Fail(DeliveryPublicMessages.ZoneUnavailable);
        }

        string? limitError = await CheckLimitsAsync(branch.Id, phone, settings, now, cancellationToken);
        if (limitError is not null)
            return Fail(limitError);

        Result<PricedCart> pricedResult = await pricing.PriceCartAsync(branch.Id, request.Lines, zone, cancellationToken);
        if (pricedResult.IsFailure)
            return Fail(pricedResult.Error!);
        PricedCart cart = pricedResult.Value!;

        if (cart.Total != request.ExpectedTotal)
        {
            DeliveryQuoteDto fresh = cart.ToQuoteDto();
            if (request.Pickup)
                fresh.EstimatedMinutes = settings.PickupEtaMinutes;
            return Result<SubmitDeliveryOrderResultDto>.Success(new SubmitDeliveryOrderResultDto { PriceChanged = true, Quote = fresh });
        }

        if (zone is not null && !cart.MeetsMinimum)
            return Fail($"{zone.Name} için en az sipariş tutarı ₺{zone.MinOrderAmount:0.##}. Sepetinize ₺{cart.AmountToMinimum:0.##} daha ekleyin.");

        // Doğrulama anahtarı en son harcanır: sınır ya da fiyat hatasında müşteri yeniden kod istemek zorunda kalmasın.
        if (PublicDeliveryContext.RequiresPhoneVerification(settings, sms))
        {
            string? verificationError = await ConsumeVerificationAsync(branch.Id, phone, request.VerificationToken, now, cancellationToken);
            if (verificationError is not null)
                return Fail(verificationError);
        }

        // Numara şube içinde en büyük + 1. Aynı anda gelen iki sipariş aynı numarayı alırsa benzersiz indeks ikincisini
        // reddeder; bir kez yeniden numara alınıp denenir.
        for (int attempt = 0; ; attempt++)
        {
            DeliveryOrder order;
            AuditLog audit;
            try
            {
                (order, audit) = await BuildAsync(branch.Id, phone, zone, cart, request, cancellationToken);
            }
            catch (DomainException ex)
            {
                return Fail(ex.Message);
            }

            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException) when (attempt == 0)
            {
                Detach(order, audit);
                if (await FindExistingAsync(branch.Id, request.ClientRequestId, cancellationToken) is { } raced)
                    return Ok(raced);
                continue;
            }

            await cashierNotifications.SendDeliveryOrdersChangedAsync(branch.Id,
                new DeliveryOrdersChangedDto { Id = order.Id, Status = order.Status, IsNew = true });
            return Ok(order);
        }
    }

    private async Task<(DeliveryOrder, AuditLog)> BuildAsync(Guid branchId, string phone, DeliveryZone? zone, PricedCart cart,
        SubmitDeliveryOrderCommand request, CancellationToken cancellationToken)
    {
        int lastNumber = await db.DeliveryOrders
            .Where(d => d.BranchId == branchId)
            .MaxAsync(d => (int?)d.Number, cancellationToken) ?? 0;

        DeliveryOrder order = zone is null
            ? DeliveryOrder.CreatePickup(branchId, lastNumber + 1, request.ClientRequestId, request.CustomerName, phone,
                request.Note, request.PaymentMethod, client.IpAddress)
            : DeliveryOrder.Create(branchId, lastNumber + 1, request.ClientRequestId, request.CustomerName, phone,
                request.Address, request.AddressDirections, request.Note, zone, request.PaymentMethod, client.IpAddress);

        foreach (PricedLine line in cart.Lines)
        {
            if (line.SetMenu is { } setMenu)
                order.AddSetMenuLine(setMenu, line.UnitPrice, line.TaxRate, line.Quantity, DeliveryScope.SerializeSelections(line.Selections), line.Note);
            else
                order.AddProductLine(line.Product!, line.UnitPrice, line.TaxRate, line.Quantity, line.Note);
        }

        db.DeliveryOrders.Add(order);
        AuditLog audit = AuditLog.Create(branchId, "Online müşteri", AuditLogCategory.Order, AuditLogSeverity.Info, "DeliveryOrderReceived",
            order.IsPickup
                ? $"Online gel al sipariş #{order.Number} geldi (₺{order.Total:0.##})."
                : $"Online paket sipariş #{order.Number} geldi ({order.ZoneName}, ₺{order.Total:0.##}).", nameof(DeliveryOrder), order.Id);
        db.AuditLogs.Add(audit);
        return (order, audit);
    }

    private void Detach(DeliveryOrder order, AuditLog audit)
    {
        foreach (DeliveryOrderLine line in order.Lines)
            db.DeliveryOrderLines.Entry(line).State = EntityState.Detached;
        db.DeliveryOrders.Entry(order).State = EntityState.Detached;
        db.AuditLogs.Entry(audit).State = EntityState.Detached;
    }

    private async Task<string?> CheckLimitsAsync(Guid branchId, string phone, OnlineOrderSettings settings, DateTime now, CancellationToken cancellationToken)
    {
        int open = await db.DeliveryOrders.AsNoTracking()
            .CountAsync(d => d.BranchId == branchId && d.CustomerPhone == phone && DeliveryScope.OpenStatuses.Contains(d.Status), cancellationToken);
        if (open >= settings.MaxOpenOrdersPerPhone)
            return $"Bu numarayla tamamlanmamış {open} siparişiniz var. Yeni sipariş için öncekilerin teslim edilmesini bekleyin ya da restoranı arayın.";

        // "Günlük" sınır son 24 saattir: gece yarısında sıfırlanıp art arda sipariş açılmasın.
        DateTime since = now.AddHours(-24);
        int today = await db.DeliveryOrders.AsNoTracking()
            .CountAsync(d => d.BranchId == branchId && d.CustomerPhone == phone && d.CreatedAt >= since, cancellationToken);
        if (today >= settings.MaxOrdersPerPhonePerDay)
            return DailyLimitMessage;

        string ip = client.IpAddress;
        if (!string.IsNullOrWhiteSpace(ip))
        {
            int pendingFromIp = await db.DeliveryOrders.AsNoTracking()
                .CountAsync(d => d.ClientIp == ip && d.Status == DeliveryOrderStatus.Received, cancellationToken);
            if (pendingFromIp >= DeliveryScope.MaxPendingPerIp)
                return PendingPerIpMessage;
        }

        return null;
    }

    private async Task<string?> ConsumeVerificationAsync(Guid branchId, string phone, string? token, DateTime now, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token))
            return VerificationRequiredMessage;

        string tokenHash = PhoneVerificationHasher.HashToken(token.Trim());
        CustomerPhoneVerification? verification = await db.CustomerPhoneVerifications
            .FirstOrDefaultAsync(v => v.VerificationTokenHash == tokenHash && v.BranchId == branchId && v.Phone == phone, cancellationToken);
        if (verification is null)
            return VerificationInvalidMessage;

        try
        {
            verification.ConsumeToken(tokenHash, now);
        }
        catch (DomainException ex)
        {
            return ex.Message;
        }
        return null;
    }

    private Task<DeliveryOrder?> FindExistingAsync(Guid branchId, Guid clientRequestId, CancellationToken cancellationToken)
        => db.DeliveryOrders.AsNoTracking().FirstOrDefaultAsync(d => d.BranchId == branchId && d.ClientRequestId == clientRequestId, cancellationToken);

    private static Result<SubmitDeliveryOrderResultDto> Ok(DeliveryOrder order)
        => Result<SubmitDeliveryOrderResultDto>.Success(new SubmitDeliveryOrderResultDto { Token = order.AccessToken, Number = order.Number });

    private static Result<SubmitDeliveryOrderResultDto> Fail(string message) => Result<SubmitDeliveryOrderResultDto>.Failure(message);
}
