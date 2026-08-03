using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.AuditLogs.Queries.GetAllAuditLogs;

namespace RestaurantBill.WebAPI.Controllers;

[Authorize(Roles = "Owner")]
[Route("api/[controller]")]
[ApiController]
public class AuditLogController : BaseController
{
    private readonly IMediator _mediator;

    public AuditLogController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Returns all audit log entries across the Owner's branches, newest first.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetAllAuditLogsQuery(), cancellationToken);
        return HandleResult(result);
    }
}
