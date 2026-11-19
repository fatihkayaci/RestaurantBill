using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.ContactMessages;

namespace RestaurantBill.WebAPI.Controllers;

// "Şikayet ve Öneriler": restoran sitesinin İletişim formundan gelen mesajlar. Şube modunda o şubenin, sahibin "Tümü"
// modunda bütün şubelerin mesajları (?branchId= ile tek şube).
[Authorize(Roles = "Owner,Admin")]
[Route("api/contact-messages")]
[ApiController]
public class ContactMessagesController : BaseController
{
    private readonly IMediator _mediator;

    public ContactMessagesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>En yenisi önce; ?unreadOnly=true yalnızca okunmamışlar; ?branchId= yalnız o şube ("Tümü" modunda süzgeç).</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool unreadOnly, [FromQuery] Guid? branchId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetContactMessagesQuery { UnreadOnly = unreadOnly, BranchId = branchId }, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetUnreadContactMessageCountQuery(), cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new MarkContactMessageReadCommand { Id = id }, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DeleteContactMessageCommand { Id = id }, cancellationToken);
        return HandleResult(result);
    }
}
