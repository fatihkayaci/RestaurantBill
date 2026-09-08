using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Reports.Queries.GetDiscountReport;
using RestaurantBill.Application.Features.Reports.Queries.GetProductReport;
using RestaurantBill.Application.Features.Reports.Queries.GetSalesReport;
using RestaurantBill.Application.Features.Reports.Queries.GetShiftReport;
using RestaurantBill.Application.Features.Reports.Queries.GetStaffReport;
using RestaurantBill.Application.Features.Reports.Queries.GetTaxReport;

namespace RestaurantBill.WebAPI.Controllers;

[Authorize(Roles = "Owner,Admin")]
[Route("api/[controller]")]
[ApiController]
public class ReportsController : BaseController
{
    private readonly IMediator _mediator;

    public ReportsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("sales")]
    public async Task<IActionResult> GetSales([FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] Guid? branchId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetSalesReportQuery { From = from, To = to, BranchId = branchId }, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("shifts")]
    public async Task<IActionResult> GetShifts([FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] Guid? branchId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetShiftReportQuery { From = from, To = to, BranchId = branchId }, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("products")]
    public async Task<IActionResult> GetProducts([FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] Guid? branchId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetProductReportQuery { From = from, To = to, BranchId = branchId }, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("staff")]
    public async Task<IActionResult> GetStaff([FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] Guid? branchId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetStaffReportQuery { From = from, To = to, BranchId = branchId }, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("discounts")]
    public async Task<IActionResult> GetDiscounts([FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] Guid? branchId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetDiscountReportQuery { From = from, To = to, BranchId = branchId }, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("tax")]
    public async Task<IActionResult> GetTax([FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] Guid? branchId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetTaxReportQuery { From = from, To = to, BranchId = branchId }, cancellationToken);
        return HandleResult(result);
    }
}
