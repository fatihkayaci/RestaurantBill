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
    [HttpGet]
    public async Task<IActionResult> GetByUserId(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetRestaurantByUserIdQuery(), cancellationToken);
        return Ok(result);
    }
        
    #endregion
    #region post methods

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRestaurantCommand command, CancellationToken cancellationToken)
    {
        await _mediator.Send(command, cancellationToken);
        return Ok(new { Message = "Restaurant oluşturuldu." });
    }
    
    #endregion
}