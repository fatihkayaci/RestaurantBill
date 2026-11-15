using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Delivery.Courier;
using RestaurantBill.Application.Features.Delivery.Staff;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.WebAPI.Controllers;

// Kurye ekranı: yalnızca kuryenin kendi siparişleri. Yola çıkış ve teslim personelin komutlarıyla aynıdır; komut kuryenin
// yalnızca kendisine atanmış siparişi ilerletmesine izin verir.
[Authorize(Roles = "Courier")]
[Route("api/courier")]
[ApiController]
public class CourierController : BaseController
{
    private readonly IMediator _mediator;

    public CourierController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Üzerindeki siparişler (kabulden yola kadar) ve bugün teslim ettikleri.</summary>
    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetCourierOrdersQuery(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Bugün teslim edilen sipariş sayısı ve kasaya teslim edilmemiş nakit/kart tahsilat.</summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetCourierSummaryQuery(), cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("orders/{id:guid}/dispatch")]
    public async Task<IActionResult> Dispatch([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DispatchDeliveryOrderCommand { Id = id }, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>{ paymentMethod: 2 (Nakit) | 1 (Kart) } — kapıda alınan ödeme.</summary>
    [HttpPost("orders/{id:guid}/deliver")]
    public async Task<IActionResult> Deliver([FromRoute] Guid id, [FromBody] CourierDeliverBody body, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DeliverDeliveryOrderCommand { Id = id, Method = body.PaymentMethod }, cancellationToken);
        return HandleResult(result);
    }

    public sealed record CourierDeliverBody(PaymentMethod PaymentMethod);
}
