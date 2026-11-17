using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RestaurantBill.Application.Features.DataManagement;

namespace RestaurantBill.WebAPI.Controllers;

// "Verileri sil" sayfası: seçerek sil, varsayılanlara dön, hesabı kapat. Yalnızca şirketin sahibi (Admin değil); handler'lar
// şirketi ayrıca OwnerUserId ile doğrular. Yıkıcı her uç önce önizleme verir, sonra restoran adı + şifre ister.
[Authorize(Roles = "Owner")]
[ApiController]
public class DataManagementController : BaseController
{
    private readonly IMediator _mediator;

    public DataManagementController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [EnableRateLimiting("data-read")]
    [HttpGet("/api/company/data")]
    public async Task<IActionResult> GetOverview(CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(new GetDataManagementOverviewQuery(), cancellationToken));

    [EnableRateLimiting("data-read")]
    [HttpPost("/api/company/data/delete/preview")]
    public async Task<IActionResult> PreviewDelete([FromBody] PreviewDataDeletionQuery query, CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(query, cancellationToken));

    [EnableRateLimiting("data-danger")]
    [HttpPost("/api/company/data/delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteDataCommand command, CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(command, cancellationToken));

    [EnableRateLimiting("data-read")]
    [HttpPost("/api/company/data/reset/preview")]
    public async Task<IActionResult> PreviewReset([FromBody] PreviewSettingsResetQuery query, CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(query, cancellationToken));

    [EnableRateLimiting("data-danger")]
    [HttpPost("/api/company/data/reset")]
    public async Task<IActionResult> Reset([FromBody] ResetSettingsCommand command, CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(command, cancellationToken));

    /// <summary>Seçilen geçmiş gruplarının CSV'leri, tek ZIP.</summary>
    [EnableRateLimiting("data-read")]
    [HttpPost("/api/company/data/export")]
    public async Task<IActionResult> Export([FromBody] ExportDataQuery query, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(query, cancellationToken);
        if (result.IsFailure)
            return BadRequest(new { result.Error });
        return File(result.Value!.Content, "application/zip", result.Value.FileName);
    }

    [EnableRateLimiting("data-read")]
    [HttpGet("/api/company/closure")]
    public async Task<IActionResult> GetClosure(CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(new GetClosureStatusQuery(), cancellationToken));

    [EnableRateLimiting("data-read")]
    [HttpPost("/api/company/closure/preview")]
    public async Task<IActionResult> PreviewClosure(CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(new PreviewAccountClosureQuery(), cancellationToken));

    [EnableRateLimiting("data-danger")]
    [HttpPost("/api/company/closure")]
    public async Task<IActionResult> Close([FromBody] CloseAccountCommand command, CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(command, cancellationToken));

    // Vazgeçmek bir şey silmez; sıkı sınıra takılıp sahibi kapalı ekranda bırakmasın.
    [EnableRateLimiting("data-read")]
    [HttpPost("/api/company/closure/cancel")]
    public async Task<IActionResult> CancelClosure(CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(new CancelAccountClosureCommand(), cancellationToken));
}
