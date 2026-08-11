using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Shifts.Commands.ApproveShiftDifference;
using RestaurantBill.Application.Features.Shifts.Commands.ApproveShiftOpeningDifference;
using RestaurantBill.Application.Features.Shifts.Commands.CloseShift;
using RestaurantBill.Application.Features.Shifts.Commands.OpenShift;
using RestaurantBill.Application.Features.Shifts.Queries.GetAllShifts;
using RestaurantBill.Application.Features.Shifts.Queries.GetCurrentShift;
using RestaurantBill.Application.Features.Shifts.Queries.GetMyCurrentShift;
using RestaurantBill.Application.Features.Shifts.Queries.GetMyCurrentShiftSummary;
using RestaurantBill.Application.Features.Shifts.Queries.GetMyCurrentShiftTransactions;
using RestaurantBill.Application.Features.Shifts.Queries.GetShiftById;
using RestaurantBill.Application.Features.Shifts.Queries.GetShiftStartCandidates;

namespace RestaurantBill.WebAPI.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class ShiftController : BaseController
{
    private readonly IMediator _mediator;
    public ShiftController(IMediator mediator)
    {
        _mediator = mediator;
    }

    #region get methods
    /// <summary>
    /// Returns all shifts for the current branch, optionally filtered by cash register.
    /// </summary>
    [Authorize(Roles = "Owner,Admin,Cashier")]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? cashRegisterId, CancellationToken cancellationToken)
    {
        var query = new GetAllShiftsQuery
        {
            CashRegisterId = cashRegisterId
        };
        var values = await _mediator.Send(query, cancellationToken);
        return HandleResult(values);
    }

    /// <summary>
    /// Returns a shift by its ID.
    /// </summary>
    /// <param name="id">ShiftId</param>
    /// <param name="cancellationToken"></param>
    [Authorize(Roles = "Owner,Admin,Cashier")]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var query = new GetShiftByIdQuery
        {
            ShiftId = id
        };
        var shift = await _mediator.Send(query, cancellationToken);
        return HandleResult(shift);
    }

    /// <summary>
    /// Returns the branch's cash registers that don't have an open shift yet, along with each one's expected opening balance.
    /// </summary>
    [Authorize(Roles = "Owner,Admin,Cashier")]
    [HttpGet("start-candidates")]
    public async Task<IActionResult> GetStartCandidates(CancellationToken cancellationToken)
    {
        var query = new GetShiftStartCandidatesQuery();
        var values = await _mediator.Send(query, cancellationToken);
        return HandleResult(values);
    }

    /// <summary>
    /// Returns the currently open shift for a cash register, if any.
    /// </summary>
    /// <param name="cashRegisterId">CashRegisterId</param>
    /// <param name="cancellationToken"></param>
    [Authorize(Roles = "Owner,Admin,Cashier")]
    [HttpGet("current/{cashRegisterId}")]
    public async Task<IActionResult> GetCurrent([FromRoute] Guid cashRegisterId, CancellationToken cancellationToken)
    {
        var query = new GetCurrentShiftQuery
        {
            CashRegisterId = cashRegisterId
        };
        var shift = await _mediator.Send(query, cancellationToken);
        return HandleResult(shift);
    }

    /// <summary>
    /// Returns the caller's currently open shift, including its cash register, if any.
    /// </summary>
    [Authorize(Roles = "Owner,Admin,Cashier")]
    [HttpGet("my-current")]
    public async Task<IActionResult> GetMyCurrent(CancellationToken cancellationToken)
    {
        var query = new GetMyCurrentShiftQuery();
        var shift = await _mediator.Send(query, cancellationToken);
        return HandleResult(shift);
    }

    /// <summary>
    /// Returns a payment-method breakdown, total, and open-tables warning count for the caller's currently open shift.
    /// </summary>
    [Authorize(Roles = "Owner,Admin,Cashier")]
    [HttpGet("my-current-summary")]
    public async Task<IActionResult> GetMyCurrentSummary(CancellationToken cancellationToken)
    {
        var query = new GetMyCurrentShiftSummaryQuery();
        var summary = await _mediator.Send(query, cancellationToken);
        return HandleResult(summary);
    }

    /// <summary>
    /// Returns the payment transactions recorded during the caller's currently open shift.
    /// </summary>
    [Authorize(Roles = "Owner,Admin,Cashier")]
    [HttpGet("my-current-transactions")]
    public async Task<IActionResult> GetMyCurrentTransactions(CancellationToken cancellationToken)
    {
        var query = new GetMyCurrentShiftTransactionsQuery();
        var values = await _mediator.Send(query, cancellationToken);
        return HandleResult(values);
    }
    #endregion

    #region post methods
    /// <summary>
    /// Opens a new shift on a cash register.
    /// </summary>
    [Authorize(Roles = "Owner,Admin,Cashier")]
    [HttpPost("open")]
    public async Task<IActionResult> Open([FromBody] OpenShiftCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Closes an open shift, recording the counted balance and any difference.
    /// </summary>
    [Authorize(Roles = "Owner,Admin,Cashier")]
    [HttpPost("close")]
    public async Task<IActionResult> Close([FromBody] CloseShiftCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Approves a closed shift's counted/expected difference, adjusting the cash register's live balance to match the physical count.
    /// </summary>
    [Authorize(Roles = "Owner,Admin")]
    [HttpPost("{id}/approve-difference")]
    public async Task<IActionResult> ApproveDifference([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var command = new ApproveShiftDifferenceCommand { ShiftId = id };
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Approves a shift's counted/expected opening difference, adjusting the cash register's live balance to match the physical count.
    /// </summary>
    [Authorize(Roles = "Owner,Admin")]
    [HttpPost("{id}/approve-opening-difference")]
    public async Task<IActionResult> ApproveOpeningDifference([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var command = new ApproveShiftOpeningDifferenceCommand { ShiftId = id };
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
    #endregion
}
