using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RestaurantBill.Application.Features.Auths.Commands.Login;
using RestaurantBill.Application.Features.Auths.Commands.Logout;
using RestaurantBill.Application.Features.Auths.Commands.Refresh;
using RestaurantBill.Application.Features.Auths.Commands.Register;
using RestaurantBill.Application.Features.Auths.Commands.SendVerificationCode;
using RestaurantBill.Application.Features.Auths.Commands.VerifyCode;

namespace RestaurantBill.WebAPI.Controllers;

[Route("api/[controller]")]
[ApiController]
[EnableRateLimiting("auth")]
public class AuthController : BaseController
{
    private const string RefreshCookieName = "refreshToken";
    private const string RefreshCookiePath = "/api/auth";

    private readonly IMediator _mediator;
    private readonly IWebHostEnvironment _environment;

    public AuthController(IMediator mediator, IWebHostEnvironment environment)
    {
        _mediator = mediator;
        _environment = environment;
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

        if (result.IsSuccess && result.Value?.RefreshToken is not null)
        {
            SetRefreshCookie(result.Value.RefreshToken, result.Value.RefreshTokenExpiresAt, result.Value.RememberMe);
            result.Value.RefreshToken = null;
        }

        return HandleResult(result);
    }

    /// <summary>
    /// Cookie'deki refresh token'ı doğrular, rotate eder ve yeni bir access token döner.
    /// </summary>
    /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
    /// <returns>200 OK with a new JWT token on success, 401 otherwise.</returns>
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken cancellationToken)
    {
        if (!Request.Cookies.TryGetValue(RefreshCookieName, out var rawToken) || string.IsNullOrEmpty(rawToken))
            return Unauthorized(new { Error = "Oturum bulunamadı, tekrar giriş yapın." });

        var command = new RefreshTokenCommand
        {
            RefreshToken = rawToken,
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers.UserAgent.ToString()
        };

        var result = await _mediator.Send(command, cancellationToken);

        if (!result.IsSuccess)
        {
            DeleteRefreshCookie();
            return Unauthorized(new { Error = result.Error });
        }

        SetRefreshCookie(result.Value!.RefreshToken, result.Value.RefreshTokenExpiresAt, result.Value.RememberMe);
        return Ok(new { Token = result.Value.AccessToken });
    }

    /// <summary>
    /// Sunucu tarafında refresh token'ı iptal eder ve cookie'yi temizler.
    /// </summary>
    /// <param name="cancellationToken">Token to cancel the asynchronous operation.</param>
    /// <returns>200 OK.</returns>
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        if (Request.Cookies.TryGetValue(RefreshCookieName, out var rawToken) && !string.IsNullOrEmpty(rawToken))
        {
            await _mediator.Send(new LogoutCommand { RefreshToken = rawToken }, cancellationToken);
        }

        DeleteRefreshCookie();
        return Ok();
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

    private void SetRefreshCookie(string rawToken, DateTime absoluteExpiresAt, bool rememberMe)
    {
        Response.Cookies.Append(RefreshCookieName, rawToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = !_environment.IsDevelopment(),
            SameSite = _environment.IsDevelopment() ? SameSiteMode.Lax : SameSiteMode.None,
            Path = RefreshCookiePath,
            Expires = rememberMe ? absoluteExpiresAt : null
        });
    }

    private void DeleteRefreshCookie()
    {
        Response.Cookies.Delete(RefreshCookieName, new CookieOptions
        {
            Path = RefreshCookiePath,
            Secure = !_environment.IsDevelopment(),
            SameSite = _environment.IsDevelopment() ? SameSiteMode.Lax : SameSiteMode.None
        });
    }
}
