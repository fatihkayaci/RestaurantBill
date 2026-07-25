using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Restaurants.Commands.UpdateRestaurant;
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
    [Authorize(Roles = "Admin, Cashier, Waiter, Kitchen")]
    [HttpGet]
    public async Task<IActionResult> GetMyRestaurant(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetRestaurantByUserIdQuery(), cancellationToken);
        return HandleResult(result);
    }
        
    #endregion
    #region post methods
    /// <summary>
    /// Creates a new restaurant and associates it with the authenticated user. Only accessible by Admin.
    /// </summary>
    /// <param name="command">Restaurant creation details containing Name, PhoneNumber, MobilePhoneNumber, Email, City and District.</param>
    /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
    /// <returns>200 OK with success message on creation.</returns>
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> UpdateRestaurant([FromBody] UpdateRestaurantCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
    
    #endregion
}