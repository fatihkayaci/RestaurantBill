using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using RestaurantBill.Application.Features.Delivery.Settings;
using RestaurantBill.Application.Features.Delivery.Staff;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.WebAPI.Controllers;

// Online paket siparişlerin personel tarafı: kasiyer ve yöneticiler. Kurye ekranı: CourierController (api/courier).
[Authorize(Roles = "Owner,Admin,Cashier")]
[Route("api/delivery-orders")]
[ApiController]
public class DeliveryOrdersController : BaseController
{
    private readonly IMediator _mediator;

    public DeliveryOrdersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>scope: active (açık siparişler, varsayılan) | today (bugünün iş günü) | history (kapanmışlar, sayfalı).</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? scope, [FromQuery] int page, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetDeliveryOrdersQuery { Scope = scope ?? GetDeliveryOrdersQuery.ActiveScope, Page = page <= 0 ? 1 : page }, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetDeliveryOrderQuery { Id = id }, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Şubenin aktif kuryeleri, üzerlerindeki siparişler ve kasaya teslim edilmemiş tahsilatları.</summary>
    [HttpGet("couriers")]
    public async Task<IActionResult> GetCouriers([FromQuery] Guid? branchId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetCouriersQuery { BranchId = branchId }, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// "Teslim al": { cashRegisterId, deliveryOrderIds[] }. Kuryenin tahsil ettiği siparişler kasiyerin açık vardiyasına
    /// ödeme olarak yazılır ve kapanır; nakit kasaya girer. Ya hepsi ya hiçbiri.
    /// </summary>
    [HttpPost("couriers/{userId:guid}/handover")]
    public async Task<IActionResult> Handover([FromRoute] Guid userId, [FromBody] HandoverBody body, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new HandoverCourierCashCommand
        {
            CourierUserId = userId,
            CashRegisterId = body.CashRegisterId,
            DeliveryOrderIds = body.DeliveryOrderIds ?? []
        }, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/accept")]
    public async Task<IActionResult> Accept([FromRoute] Guid id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] EtaBody? body, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new AcceptDeliveryOrderCommand { Id = id, EtaMinutes = body?.EtaMinutes }, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject([FromRoute] Guid id, [FromBody] ReasonBody body, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new RejectDeliveryOrderCommand { Id = id, Reason = body.Reason ?? string.Empty }, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel([FromRoute] Guid id, [FromBody] ReasonBody body, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new CancelDeliveryOrderCommand { Id = id, Reason = body.Reason ?? string.Empty }, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>courierUserId null: kurye ataması kaldırılır.</summary>
    [HttpPost("{id:guid}/assign-courier")]
    public async Task<IActionResult> AssignCourier([FromRoute] Guid id, [FromBody] CourierBody body, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new AssignCourierCommand { Id = id, CourierUserId = body.CourierUserId }, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/dispatch")]
    public async Task<IActionResult> Dispatch([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DispatchDeliveryOrderCommand { Id = id }, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Teslim ve tahsilat kaydı; kasaya geçiş kasiyerin "Teslim al"ıyla olur.</summary>
    [HttpPost("{id:guid}/deliver")]
    public async Task<IActionResult> Deliver([FromRoute] Guid id, [FromBody] DeliverBody body, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DeliverDeliveryOrderCommand { Id = id, Method = body.Method }, cancellationToken);
        return HandleResult(result);
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpPost("{id:guid}/block-phone")]
    public async Task<IActionResult> BlockPhone([FromRoute] Guid id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] ReasonBody? body, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new BlockDeliveryOrderPhoneCommand { DeliveryOrderId = id, Reason = body?.Reason }, cancellationToken);
        return HandleResult(result);
    }

    public sealed record EtaBody(int? EtaMinutes);
    public sealed record ReasonBody(string? Reason);
    public sealed record CourierBody(Guid? CourierUserId);
    public sealed record DeliverBody(PaymentMethod Method);
    public sealed record HandoverBody(Guid CashRegisterId, List<Guid>? DeliveryOrderIds);
}

// Online siparişin şube ayarları (Owner/Admin) ve kasanın "Online siparişi durdur" anahtarı.
[Authorize]
[Route("api/online-ordering")]
[ApiController]
public class OnlineOrderingController : BaseController
{
    private readonly IMediator _mediator;

    public OnlineOrderingController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetOnlineOrderSettingsQuery(), cancellationToken);
        return HandleResult(result);
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateOnlineOrderSettingsCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Kasanın "Online siparişe kapalı" anahtarı: { branchId, paused, enabled }.</summary>
    [Authorize(Roles = "Owner,Admin,Cashier")]
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus([FromQuery] Guid? branchId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetOnlineOrderingStatusQuery { BranchId = branchId }, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>{ paused, branchId? } — Owner "Tümü" modundaysa şube verilmelidir.</summary>
    [Authorize(Roles = "Owner,Admin,Cashier")]
    [HttpPost("pause")]
    public async Task<IActionResult> Pause([FromBody] SetOnlineOrderingPausedCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize(Roles = "Owner,Admin")]
[Route("api/delivery-zones")]
[ApiController]
public class DeliveryZonesController : BaseController
{
    private readonly IMediator _mediator;

    public DeliveryZonesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetDeliveryZonesQuery(), cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveDeliveryZoneCommand command, CancellationToken cancellationToken)
    {
        command.Id = null;
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] SaveDeliveryZoneCommand command, CancellationToken cancellationToken)
    {
        command.Id = id;
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DeleteDeliveryZoneCommand { Id = id }, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>{ zoneIds: [...] } — müşteri sitesindeki sıra.</summary>
    [HttpPut("order")]
    public async Task<IActionResult> Reorder([FromBody] ReorderDeliveryZonesCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize(Roles = "Owner,Admin")]
[Route("api/blocked-phones")]
[ApiController]
public class BlockedPhonesController : BaseController
{
    private readonly IMediator _mediator;

    public BlockedPhonesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetBlockedPhonesQuery(), cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    public async Task<IActionResult> Block([FromBody] BlockPhoneCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Unblock([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new UnblockPhoneCommand { Id = id }, cancellationToken);
        return HandleResult(result);
    }
}
