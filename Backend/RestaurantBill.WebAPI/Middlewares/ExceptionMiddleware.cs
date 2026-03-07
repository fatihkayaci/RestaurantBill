using System.Net;
using System.Text.Json;
using RestaurantBill.Application.Exceptions;

namespace RestaurantBill.WebAPI.Middlewares;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext httpContext)
    {
        try
        {
            await _next(httpContext);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Sistemde feci bir patlama oldu: {ErrorMessage}", ex.Message);
            await HandleExceptionAsync(httpContext, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        
        int statusCode = (int)HttpStatusCode.InternalServerError;
        string message = "Internal Server Error from the custom middleware.";

        if (exception is BaseException baseEx)
        {
            statusCode = baseEx.StatusCode;
            message = baseEx.Message;
        }

        context.Response.StatusCode = statusCode;

        var result = JsonSerializer.Serialize(new 
        {
            StatusCode = statusCode,
            Message = message
        });

        return context.Response.WriteAsync(result);
    }
}