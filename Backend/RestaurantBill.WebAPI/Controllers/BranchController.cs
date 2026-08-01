using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Restaurants.Commands.CreateBranch;
using RestaurantBill.Application.Features.Restaurants.Commands.UpdateBranch;
using RestaurantBill.Application.Features.Restaurants.Queries.GetBranchByUserId;
using RestaurantBill.Application.Features.Restaurants.Queries.GetMyBranches;

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
    /// Returns all restaurants (branches) owned by the authenticated Owner.
    /// </summary>
    /// <returns>200 OK with the list of branches on success.</returns>
    [Authorize(Roles = "Owner")]
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
    /*
    [Authorize(Roles = "Owner, Admin, Cashier, Waiter, Kitchen")]
    [HttpGet]
    public async Task<IActionResult> GetMyBranch(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetBranchByUserIdQuery(), cancellationToken);
        return HandleResult(result);
    }
*/
    #endregion
}