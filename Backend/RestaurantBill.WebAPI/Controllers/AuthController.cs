using MediatR;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Auths.Commands.Login;
using RestaurantBill.Application.Features.Auths.Commands.Register;

namespace RestaurantBill.WebAPI.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }
    #region post methods

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody]LoginCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }
    
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterCommand command)
    {
        await _mediator.Send(command);
        return Ok(new { Message = "Kullanıcı kaydı tamamlandı." }); 
    }
    #endregion
}