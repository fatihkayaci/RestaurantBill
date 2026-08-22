using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.AuditLogs.Queries.GetAllAuditLogs;
using RestaurantBill.Application.Features.AuditLogs.Queries.GetAuditLogActors;

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
    /// Returns a page of audit log entries across the Owner's branches, newest first.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int pageNumber,
        [FromQuery] int pageSize,
        [FromQuery] string? search,
        [FromQuery] int? category,
        [FromQuery] int? severity,
        [FromQuery] Guid? branchId,
        [FromQuery] string? actorName,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        CancellationToken cancellationToken)
    {
        var query = new GetAllAuditLogsQuery
        {
            Search = search,
            Category = category,
            Severity = severity,
            BranchId = branchId,
            ActorName = actorName,
            DateFrom = dateFrom,
            DateTo = dateTo,
        };
        if (pageNumber > 0) query.PageNumber = pageNumber;
        if (pageSize > 0) query.PageSize = pageSize;

        var result = await _mediator.Send(query, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Returns the distinct actor names found in the Owner's audit logs, for filter dropdowns.
    /// </summary>
    [HttpGet("actors")]
    public async Task<IActionResult> GetActors(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetAuditLogActorsQuery(), cancellationToken);
        return HandleResult(result);
    }
}
