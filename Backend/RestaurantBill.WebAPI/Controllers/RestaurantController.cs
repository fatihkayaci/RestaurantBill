using MediatR;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Restaurants.Commands.CreateRestaurant;
using RestaurantBill.Application.Features.Restaurants.Queries.GetRestaurantByUserId;

namespace RestaurantBill.WebAPI.Controllers;

[Route("api/[controller]")]
[ApiController]
public class RestaurantController : ControllerBase
{
    private readonly IMediator _mediator;
    public RestaurantController(IMediator mediator)
    {
        _mediator = mediator;
    }
    #region get methods
    /// <summary>
    /// returns all Restaurants with user id
    /// </summary>
    /// <returns>200 OK with Restaurants data on success.</returns>
    [HttpGet]
    public async Task<IActionResult> GetByUserId(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetRestaurantByUserIdQuery(), cancellationToken);
        return Ok(result);
    }
        
    #endregion
    #region post methods
    /// <summary>
    /// Restaurant create
    /// </summary>
    /// <param name="command">Restaurant create credentials containing Name, PhoneNumber, MobilePhoneNumber, Email, City and District </param>
    /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
    /// <returns>200 OK with string message on success.</returns>
    [HttpPost]
    public async Task<IActionResult> CreateRestaurant([FromBody] CreateRestaurantCommand command, CancellationToken cancellationToken)
    {
        await _mediator.Send(command, cancellationToken);
        return Ok(new { Message = "Restaurant oluşturuldu." });
    }
    
    #endregion
}