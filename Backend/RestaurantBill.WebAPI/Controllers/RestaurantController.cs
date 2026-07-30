using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Restaurants.Commands.CreateBranch;
using RestaurantBill.Application.Features.Restaurants.Commands.SetBranchSlug;
using RestaurantBill.Application.Features.Restaurants.Commands.UpdateBranch;
using RestaurantBill.Application.Features.Restaurants.Queries.GetMyBranches;
using RestaurantBill.Application.Features.Restaurants.Queries.GetRestaurantByUserId;

namespace RestaurantBill.WebAPI.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class RestaurantController : BaseController
{
    private readonly IMediator _mediator;
    public RestaurantController(IMediator mediator)
    {
        _mediator = mediator;
    }
    #region get methods
    /// <summary>
    /// Returns all restaurants associated with the authenticated user. Only accessible by Admin.
    /// </summary>
    /// <returns>200 OK with restaurant list on success.</returns>
    [Authorize(Roles = "Owner, Admin, Cashier, Waiter, Kitchen")]
    [HttpGet]
    public async Task<IActionResult> GetMyRestaurant(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetRestaurantByUserIdQuery(), cancellationToken);
        return HandleResult(result);
    }

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
    #region post methods
    /// <summary>
    /// Creates a new branch (restaurant) owned by the authenticated Owner.
    /// </summary>
    /// <param name="command">Branch creation details containing Name.</param>
    /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
    /// <returns>200 OK with the created branch on success.</returns>
    [Authorize(Roles = "Owner")]
    [HttpPost("branches")]
    public async Task<IActionResult> CreateBranch([FromBody] CreateBranchCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Sets or updates the subdomain slug for a specific branch owned by the authenticated Owner.
    /// </summary>
    /// <param name="id">The ID of the branch (restaurant) to set the slug for.</param>
    /// <param name="command">Slug creation details containing the desired Slug.</param>
    /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
    /// <returns>200 OK with the assigned slug on success.</returns>
    [Authorize(Roles = "Owner")]
    [HttpPost("branches/{id}/slug")]
    public async Task<IActionResult> SetBranchSlug([FromRoute] int id, [FromBody] SetBranchSlugCommand command, CancellationToken cancellationToken)
    {
        command.RestaurantId = id;
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Updates the details (name, contact info) of a specific branch owned by the authenticated Owner.
    /// </summary>
    /// <param name="id">The ID of the branch (restaurant) to update.</param>
    /// <param name="command">Branch details containing Name, PhoneNumber, Email, City and District.</param>
    /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
    /// <returns>200 OK on success.</returns>
    [Authorize(Roles = "Owner")]
    [HttpPost("branches/{id}")]
    public async Task<IActionResult> UpdateBranch([FromRoute] int id, [FromBody] UpdateBranchCommand command, CancellationToken cancellationToken)
    {
        command.RestaurantId = id;
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    #endregion
}