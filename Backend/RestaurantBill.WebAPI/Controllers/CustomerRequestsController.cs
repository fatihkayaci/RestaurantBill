using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using RestaurantBill.Application.Features.CustomerSite.Staff;

namespace RestaurantBill.WebAPI.Controllers;

// Müşterinin QR'dan gönderdiği sipariş taleplerinin personel tarafı.
[Authorize(Roles = "Owner,Admin,Waiter")]
[Route("api/order-request")]
[ApiController]
public class OrderRequestController : BaseController
{
    private readonly IMediator _mediator;

    public OrderRequestController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetPending(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetPendingOrderRequestsQuery(), cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new ApproveOrderRequestCommand { Id = id }, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Red; gövde isteğe bağlı: { reason } müşteriye "Onaylanmadı" kartında gösterilir.</summary>
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject([FromRoute] Guid id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] RejectOrderRequestBody? body, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new RejectOrderRequestCommand { Id = id, Reason = body?.Reason }, cancellationToken);
        return HandleResult(result);
    }

    public sealed record RejectOrderRequestBody(string? Reason);

    /// <summary>"QR kilidini aç": masa QR'da artık bir telefona bağlı değil; sonraki ilk talebi gönderen telefon sahip olur.</summary>
    [HttpPost("table/{tableId:guid}/qr-unlock")]
    public async Task<IActionResult> UnlockQrTable([FromRoute] Guid tableId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new UnlockQrTableCommand { TableId = tableId }, cancellationToken);
        return HandleResult(result);
    }
}

// Müşterinin siteden gönderdiği rezervasyon taleplerinin personel tarafı.
[Authorize(Roles = "Owner,Admin,Waiter")]
[Route("api/reservation")]
[ApiController]
public class ReservationController : BaseController
{
    private readonly IMediator _mediator;

    public ReservationController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetCustomerReservationsQuery(), cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/confirm")]
    public Task<IActionResult> Confirm([FromRoute] Guid id, CancellationToken cancellationToken)
        => Decide(id, ReservationDecision.Confirm, cancellationToken);

    [HttpPost("{id:guid}/reject")]
    public Task<IActionResult> Reject([FromRoute] Guid id, CancellationToken cancellationToken)
        => Decide(id, ReservationDecision.Reject, cancellationToken);

    [HttpPost("{id:guid}/cancel")]
    public Task<IActionResult> Cancel([FromRoute] Guid id, CancellationToken cancellationToken)
        => Decide(id, ReservationDecision.Cancel, cancellationToken);

    /// <summary>"Geldi": masa dolu olur, bekleyen ön sipariş masanın siparişine yazılıp mutfağa gider.</summary>
    [HttpPost("{id:guid}/seat")]
    public Task<IActionResult> Seat([FromRoute] Guid id, CancellationToken cancellationToken)
        => Arrival(id, ReservationArrival.Seat, cancellationToken);

    /// <summary>"Gelmedi": bekleyen ön sipariş iptal edilir.</summary>
    [HttpPost("{id:guid}/no-show")]
    public Task<IActionResult> NoShow([FromRoute] Guid id, CancellationToken cancellationToken)
        => Arrival(id, ReservationArrival.NoShow, cancellationToken);

    /// <summary>"Mutfağa şimdi gönder": ön sipariş misafir gelmeden mutfağa gider; rezervasyon "geldi" sayılır.</summary>
    [HttpPost("{id:guid}/fire-pre-order")]
    public Task<IActionResult> FirePreOrder([FromRoute] Guid id, CancellationToken cancellationToken)
        => Arrival(id, ReservationArrival.FirePreOrder, cancellationToken);

    private async Task<IActionResult> Arrival(Guid id, ReservationArrival action, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new ReservationArrivalCommand { Id = id, Action = action }, cancellationToken);
        return HandleResult(result);
    }

    private async Task<IActionResult> Decide(Guid id, ReservationDecision decision, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DecideReservationCommand { Id = id, Decision = decision }, cancellationToken);
        return HandleResult(result);
    }
}
