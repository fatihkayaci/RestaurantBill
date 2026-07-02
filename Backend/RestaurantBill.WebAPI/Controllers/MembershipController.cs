using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Memberships.Queries.GetMembershipByRestaurantId;

namespace RestaurantBill.WebAPI.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class MembershipController : ControllerBase
{
    private readonly IMediator _mediator;
    public MembershipController(IMediator mediator)
    {
        _mediator = mediator;
    }

    #region get methods
    /// <summary>
    /// Returns the membership associated with the authenticated user's restaurant.
    /// </summary>
    /// <returns>200 OK with membership on success.</returns>
    [Authorize(Roles = "Admin, Cashier, Waiter, Kitchen")]
    [HttpGet]
    public async Task<IActionResult> GetMyMembership(CancellationToken cancellationToken)
    {
        MembershipDto result = await _mediator.Send(new GetMembershipByRestaurantIdQuery(), cancellationToken);
        return Ok(result);
    }
    #endregion
}
