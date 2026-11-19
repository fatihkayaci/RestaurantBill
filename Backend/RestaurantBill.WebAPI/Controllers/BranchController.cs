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
using RestaurantBill.Application.Features.Branches.QrMenu;
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

    #region qr menu features
    /// <summary>Oturumdaki şubenin masa QR karşılama ekranı anahtarları (kaydedilmemişse hepsi açık).</summary>
    [Authorize(Roles = "Owner,Admin")]
    [HttpGet("qr-features")]
    public async Task<IActionResult> GetQrFeatures(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetBranchQrFeaturesQuery(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>Sipariş, garson çağır, hesap iste, paket servis ve rezervasyon bağlantısı anahtarları.</summary>
    [Authorize(Roles = "Owner,Admin")]
    [HttpPut("qr-features")]
    public async Task<IActionResult> UpdateQrFeatures([FromBody] UpdateBranchQrFeaturesCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
    #endregion

    #region restaurant site
    // Restoran sitesi şirket genelidir; düzenleyicisi SiteEditorController'da (api/company/site, yalnız sahip).
    // Burada yalnız sitenin şubeye ait bilgileri: çalışma saatleri, saat notu, WhatsApp, nasıl gelinir.

    /// <summary>Oturumdaki şubenin site bilgileri (Ayarlar → Saatler ve iletişim).</summary>
    [Authorize(Roles = "Owner,Admin")]
    [HttpGet("site-info")]
    public async Task<IActionResult> GetSiteInfo(CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(new GetBranchSiteInfoQuery(), cancellationToken));

    /// <summary>Taslaksız, hemen yayında (adres ve telefon gibi).</summary>
    [Authorize(Roles = "Owner,Admin")]
    [HttpPut("site-info")]
    public async Task<IActionResult> UpdateSiteInfo([FromBody] UpdateBranchSiteInfoCommand command, CancellationToken cancellationToken)
        => HandleResult(await _mediator.Send(command, cancellationToken));
    #endregion
}