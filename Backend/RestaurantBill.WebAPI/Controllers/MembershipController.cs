using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Memberships.Queries.GetMembershipByRestaurantId;

namespace RestaurantBill.WebAPI.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class MembershipController : BaseController
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
        var result = await _mediator.Send(new GetMembershipByRestaurantIdQuery(), cancellationToken);
        return HandleResult(result);
    }
    #endregion
}
