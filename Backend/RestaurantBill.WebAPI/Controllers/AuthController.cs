using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RestaurantBill.Application.Features.Auths.Commands.Login;
using RestaurantBill.Application.Features.Auths.Commands.Register;
using RestaurantBill.Application.Features.Auths.Commands.SendVerificationCode;
using RestaurantBill.Application.Features.Auths.Commands.VerifyCode;

namespace RestaurantBill.WebAPI.Controllers;

[Route("api/[controller]")]
[ApiController]
[EnableRateLimiting("auth")]
public class AuthController : BaseController
{
    private readonly IMediator _mediator;
    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }
    #region post methods
    /// <summary>
    /// Authenticates a user and returns a JWT token.
    /// </summary>
    /// <param name="command">Login credentials containing username and password.</param>
    /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
    /// <returns>200 OK with JWT token on success.</returns>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody]LoginCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Endpoint used for user registration 
    /// </summary>
    /// <param name="command"> Register credentials containing Full Name, UserName, Email, User Code and Password </param>
    /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
    /// <returns>200 Ok with string message on success</returns>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Sends a verification code to the user via SMS or email.
    /// </summary>
    /// <param name="command">UserId and verification type (Phone or Email).</param>
    /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
    /// <returns>200 OK on success.</returns>
    [HttpPost("send-verification-code")]
    public async Task<IActionResult> SendVerificationCode([FromBody] SendVerificationCodeCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Verifies a code previously sent to the user.
    /// </summary>
    /// <param name="command">UserId and the code to verify.</param>
    /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
    /// <returns>200 OK on success.</returns>
    [HttpPost("verify-code")]
    public async Task<IActionResult> VerifyCode([FromBody] VerifyCodeCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
    #endregion
}