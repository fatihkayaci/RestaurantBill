using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new RejectOrderRequestCommand { Id = id }, cancellationToken);
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

    private async Task<IActionResult> Decide(Guid id, ReservationDecision decision, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DecideReservationCommand { Id = id, Decision = decision }, cancellationToken);
        return HandleResult(result);
    }
}
