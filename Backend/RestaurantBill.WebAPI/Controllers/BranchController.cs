using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Restaurants.Commands.CreateBranch;
using RestaurantBill.Application.Features.Restaurants.Commands.DeleteBranch;
using RestaurantBill.Application.Features.Restaurants.Commands.UpdateBranch;
using RestaurantBill.Application.Features.Restaurants.Commands.UpdateBranchDayEndSettings;
using RestaurantBill.Application.Features.Restaurants.Queries.GetBranchByUserId;
using RestaurantBill.Application.Features.Restaurants.Queries.GetMyBranches;
using RestaurantBill.Application.Features.Branches.Payment;
using RestaurantBill.Application.Features.Branches.Site;
using RestaurantBill.Application.Features.Branches.ReservationRules;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.WebAPI.Controllers;

[Authorize]
[Route("api/branch")]
[ApiController]
public class BranchController : BaseController
{
    private readonly IMediator _mediator;
    public BranchController(IMediator mediator)
    {
        _mediator = mediator;
    }
    #region get methods
    

    /// <summary>
    /// Returns the branches the caller can switch to: all company branches for an Owner, assigned branches for an Admin.
    /// </summary>
    /// <returns>200 OK with the list of branches on success.</returns>
    [Authorize(Roles = "Owner,Admin")]
    [HttpGet("branches")]
    public async Task<IActionResult> GetMyBranches(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetMyBranchesQuery(), cancellationToken);
        return HandleResult(result);
    }

    #endregion
    #region post method

    [Authorize(Roles = "Owner")]
    [HttpPost("branches")]
    public async Task<IActionResult> CreateBranch([FromBody] CreateBranchCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    [Authorize(Roles = "Owner")]
    [HttpPost("branches/{id}")]
    public async Task<IActionResult> UpdateBranch([FromRoute] Guid id, [FromBody] UpdateBranchCommand command, CancellationToken cancellationToken)
    {
        command.RestaurantId = id;
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    [Authorize(Roles = "Owner")]
    [HttpDelete("branches/{id}")]
    public async Task<IActionResult> DeleteBranch([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DeleteBranchCommand { BranchId = id }, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Updates the branch's day-end (gün sonu) time and time zone, used to auto-close open shifts.
    /// </summary>
    [Authorize(Roles = "Owner,Admin")]
    [HttpPost("branches/{id}/day-end-settings")]
    public async Task<IActionResult> UpdateDayEndSettings([FromRoute] Guid id, [FromBody] UpdateBranchDayEndSettingsCommand command, CancellationToken cancellationToken)
    {
        command.BranchId = id;
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
    /// <summary>
    /// Returns the branch info for the authenticated user's own branch.
    /// </summary>
    [Authorize(Roles = "Owner,Admin")]
    [HttpGet]
    public async Task<IActionResult> GetMyBranch(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetBranchByUserIdQuery(), cancellationToken);
        return HandleResult(result);
    }
    #endregion

    #region payment settings
    /// <summary>Oturumdaki şubenin IBAN bilgisi. Kasiyer ve ödeme alan garson IBAN ile ödeme QR'ı için okur.</summary>
    [Authorize(Roles = "Owner,Admin,Cashier,Waiter")]
    [HttpGet("payment-settings")]
    public async Task<IActionResult> GetPaymentSettings(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetBranchPaymentSettingsQuery(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>IBAN ve hesap sahibi. İkisi de boş gönderilirse IBAN ile ödeme kapanır.</summary>
    [Authorize(Roles = "Owner,Admin")]
    [HttpPut("payment-settings")]
    public async Task<IActionResult> UpdatePaymentSettings([FromBody] UpdateBranchPaymentSettingsCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
    #endregion

    #region reservation settings
    /// <summary>Oturumdaki şubenin rezervasyon ayarları (kaydedilmemişse varsayılanlar, IsCustomized=false).</summary>
    [Authorize(Roles = "Owner,Admin")]
    [HttpGet("reservation-settings")]
    public async Task<IActionResult> GetReservationSettings(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetBranchReservationSettingsQuery(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Açık/kapalı, haftalık saatler, aralık, süre, gün ve kişi sınırı. ResetToDefaults=true varsayılanlara döndürür.</summary>
    [Authorize(Roles = "Owner,Admin")]
    [HttpPut("reservation-settings")]
    public async Task<IActionResult> UpdateReservationSettings([FromBody] UpdateBranchReservationSettingsCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
    #endregion

    #region restaurant site
    /// <summary>Oturumdaki şubenin müşteri sitesi içeriği (başlık, hikâye, saatler, fotoğraflar).</summary>
    [Authorize(Roles = "Owner,Admin")]
    [HttpGet("site")]
    public async Task<IActionResult> GetSite(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetBranchSiteQuery(), cancellationToken);
        return HandleResult(result);
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpPut("site")]
    public async Task<IActionResult> UpdateSite([FromBody] UpdateBranchSiteCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Kapak (cover) ya da hikâye (about) fotoğrafını yükler; eskisi silinir.</summary>
    [Authorize(Roles = "Owner,Admin")]
    [HttpPost("site/image/{slot}")]
    [RequestSizeLimit(11_000_000)]
    public async Task<IActionResult> UploadSiteImage([FromRoute] string slot, IFormFile file, CancellationToken cancellationToken)
    {
        if (!TryParseSlot(slot, out SiteImageSlot imageSlot)) return BadRequest(new { Error = "Geçersiz görsel alanı." });
        if (file is null || file.Length == 0) return BadRequest(new { Error = "Dosya seçilmedi." });
        if (file.Length > 10_000_000) return BadRequest(new { Error = "Görsel en fazla 10 MB olabilir." });

        await using Stream stream = file.OpenReadStream();
        var result = await _mediator.Send(new SetBranchSiteImageCommand { Slot = imageSlot, Content = stream }, cancellationToken);
        return HandleResult(result);
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpDelete("site/image/{slot}")]
    public async Task<IActionResult> DeleteSiteImage([FromRoute] string slot, CancellationToken cancellationToken)
    {
        if (!TryParseSlot(slot, out SiteImageSlot imageSlot)) return BadRequest(new { Error = "Geçersiz görsel alanı." });
        var result = await _mediator.Send(new SetBranchSiteImageCommand { Slot = imageSlot, Content = null }, cancellationToken);
        return HandleResult(result);
    }

    private static bool TryParseSlot(string value, out SiteImageSlot slot)
    {
        slot = value.ToLowerInvariant() switch { "cover" => SiteImageSlot.Cover, "about" => SiteImageSlot.About, _ => 0 };
        return slot != 0;
    }
    #endregion
}