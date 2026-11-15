using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RestaurantBill.Application.Features.ContactMessages.Public;
using RestaurantBill.Application.Features.CustomerSite.Public;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Features.Delivery.Public;

namespace RestaurantBill.WebAPI.Controllers;

// Restoranın müşteriye açık sitesi: menü, masa QR'ından sipariş talebi, rezervasyon talebi, online paket sipariş, iletişim formu.
// Giriş gerekmez; restoran X-Restaurant-Slug başlığından çözülür. Yazma uçları sıkı rate-limit altındadır.
[AllowAnonymous]
[Route("api/public")]
[ApiController]
public class PublicController : BaseController
{
    private readonly IMediator _mediator;

    public PublicController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [EnableRateLimiting("public-read")]
    [HttpGet("site")]
    public async Task<IActionResult> GetSite([FromQuery] Guid? branchId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetPublicSiteQuery { BranchId = branchId }, cancellationToken);
        return HandleResult(result);
    }

    [EnableRateLimiting("public-read")]
    [HttpGet("table/{tableId:guid}")]
    public async Task<IActionResult> GetTable([FromRoute] Guid tableId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetPublicTableQuery { TableId = tableId }, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Masaya bakan garsonlara canlı "garson çağırıyor" uyarısı. Sent=false: bu masadan az önce çağrılmış.</summary>
    [EnableRateLimiting("public-table-action")]
    [HttpPost("table/{tableId:guid}/call-waiter")]
    public async Task<IActionResult> CallWaiter([FromRoute] Guid tableId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new CallWaiterCommand { TableId = tableId }, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Masanın açık hesabı için hesap isteği (personelin "Hesap iste"siyle aynı bildirimler).</summary>
    [EnableRateLimiting("public-table-action")]
    [HttpPost("table/{tableId:guid}/request-bill")]
    public async Task<IActionResult> RequestBill([FromRoute] Guid tableId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new RequestTableBillCommand { TableId = tableId }, cancellationToken);
        return HandleResult(result);
    }

    [EnableRateLimiting("public-read")]
    [HttpGet("availability")]
    public async Task<IActionResult> GetAvailability([FromQuery] Guid? branchId, [FromQuery] string date, [FromQuery] string time, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetReservationAvailabilityQuery { BranchId = branchId, Date = date ?? string.Empty, Time = time ?? string.Empty }, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Bir günün saat başı rezervasyon başlangıçları ve hangilerinde boş masa kalmadığı.</summary>
    [EnableRateLimiting("public-read")]
    [HttpGet("day-slots")]
    public async Task<IActionResult> GetDaySlots([FromQuery] Guid? branchId, [FromQuery] string date, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetDaySlotsQuery { BranchId = branchId, Date = date ?? string.Empty }, cancellationToken);
        return HandleResult(result);
    }

    [EnableRateLimiting("public-write")]
    [HttpPost("order-requests")]
    public async Task<IActionResult> CreateOrderRequest([FromBody] CreateOrderRequestCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    [EnableRateLimiting("public-read")]
    [HttpGet("order-requests/{id:guid}")]
    public async Task<IActionResult> GetOrderRequestStatus([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetOrderRequestStatusQuery { Id = id }, cancellationToken);
        return HandleResult(result);
    }

    [EnableRateLimiting("public-write")]
    [HttpPost("reservations")]
    public async Task<IActionResult> CreateReservation([FromBody] CreateReservationRequestCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// "Rezervasyon sorgula": { code: "K7M-2QP", phone: "0532 123 45 67" } → { accessToken }. Kod büyük/küçük harf,
    /// boşluk ve tireden bağımsızdır. Eşleşmezse her durumda aynı 400 mesajı döner.
    /// </summary>
    [EnableRateLimiting("reservation-lookup")]
    [HttpPost("reservations/lookup")]
    public async Task<IActionResult> LookupReservation([FromBody] LookupReservationCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Eski bağlantılar için; kimlik döndürmez. Yeni istemci by-token ucunu kullanır.</summary>
    [EnableRateLimiting("public-read")]
    [HttpGet("reservations/{id:guid}")]
    public async Task<IActionResult> GetReservationStatus([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetReservationStatusQuery { Id = id }, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Rezervasyon sayfası (/rezervasyon/:token): özet, ön sipariş penceresi ve mevcut ön sipariş.</summary>
    [EnableRateLimiting("public-read")]
    [HttpGet("reservations/by-token/{token}")]
    public async Task<IActionResult> GetReservationByToken([FromRoute] string token, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetReservationByTokenQuery { Token = token }, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Ön siparişi ver ya da değiştir: { items: [{ productId, quantity, note }], note }. Fiyatlar sunucuda hesaplanır.</summary>
    [EnableRateLimiting("public-write")]
    [HttpPut("reservations/{token}/pre-order")]
    public async Task<IActionResult> UpsertPreOrder([FromRoute] string token, [FromBody] UpsertPreOrderCommand command, CancellationToken cancellationToken)
    {
        command.Token = token;
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    [EnableRateLimiting("public-write")]
    [HttpDelete("reservations/{token}/pre-order")]
    public async Task<IActionResult> CancelPreOrder([FromRoute] string token, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new CancelPreOrderCommand { Token = token }, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>İletişim formu: { branchId, name, contact, type, message, website }. "website" bal küpüdür, boş gelmeli.</summary>
    [EnableRateLimiting("public-write")]
    [HttpPost("contact-messages")]
    public async Task<IActionResult> SubmitContactMessage([FromBody] SubmitContactMessageCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    // ── Online paket sipariş ────────────────────────────────────────────────────────────────────

    /// <summary>Sipariş sayfası: açık/durduruldu/kapalı durumu, bölgeler, ödeme yöntemleri, menü ve şube seçici.</summary>
    [EnableRateLimiting("public-read")]
    [HttpGet("online-ordering")]
    public async Task<IActionResult> GetOnlineOrdering([FromQuery] Guid? branchId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetOnlineOrderingQuery { BranchId = branchId }, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Sepetin sunucu fiyatları, teslimat ücreti ve en az tutar durumu.</summary>
    [EnableRateLimiting("public-read")]
    [HttpPost("delivery-orders/quote")]
    public async Task<IActionResult> QuoteDeliveryOrder([FromBody] QuoteDeliveryOrderCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Sipariş gönder: { token, number }. Fiyatlar değiştiyse 409 { error: "Fiyatlar güncellendi", quote }.</summary>
    [EnableRateLimiting("delivery-write")]
    [HttpPost("delivery-orders")]
    public async Task<IActionResult> SubmitDeliveryOrder([FromBody] SubmitDeliveryOrderCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsSuccess && result.Value!.PriceChanged)
            return Conflict(new { Error = DeliveryScope.PriceChangedMessage, result.Value.Quote });
        if (result.IsSuccess)
            return Ok(new { result.Value!.Token, result.Value.Number });
        return HandleResult(result);
    }

    /// <summary>Takip sayfası; anahtar siparişte verilen rastgele token'dır.</summary>
    [EnableRateLimiting("public-read")]
    [HttpGet("delivery-orders/{token}")]
    public async Task<IActionResult> GetDeliveryTracking([FromRoute] string token, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetDeliveryTrackingQuery { Token = token }, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Müşteri iptali; yalnızca restoran onaylamadan önce.</summary>
    [EnableRateLimiting("public-write")]
    [HttpPost("delivery-orders/{token}/cancel")]
    public async Task<IActionResult> CancelDeliveryOrder([FromRoute] string token, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new CancelDeliveryOrderByCustomerCommand { Token = token }, cancellationToken);
        return HandleResult(result);
    }

    [EnableRateLimiting("otp")]
    [HttpPost("phone-verification/send")]
    public async Task<IActionResult> SendPhoneVerification([FromBody] SendPhoneVerificationCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    [EnableRateLimiting("otp")]
    [HttpPost("phone-verification/verify")]
    public async Task<IActionResult> VerifyPhone([FromBody] VerifyPhoneCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
}
