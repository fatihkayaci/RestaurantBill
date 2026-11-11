using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RestaurantBill.Application.Features.CustomerSite.Public;

namespace RestaurantBill.WebAPI.Controllers;

// Restoranın müşteriye açık sitesi: menü, masa QR'ından sipariş talebi, rezervasyon talebi.
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

    [EnableRateLimiting("public-read")]
    [HttpGet("availability")]
    public async Task<IActionResult> GetAvailability([FromQuery] Guid? branchId, [FromQuery] string date, [FromQuery] string time, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetReservationAvailabilityQuery { BranchId = branchId, Date = date ?? string.Empty, Time = time ?? string.Empty }, cancellationToken);
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

    [EnableRateLimiting("public-read")]
    [HttpGet("reservations/{id:guid}")]
    public async Task<IActionResult> GetReservationStatus([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetReservationStatusQuery { Id = id }, cancellationToken);
        return HandleResult(result);
    }
}
