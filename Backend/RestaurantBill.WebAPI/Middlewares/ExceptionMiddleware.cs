using System.Net;
using System.Text.Json;
using RestaurantBill.Application.Exceptions;
using FluentValidation;
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
        string message = "Sunucu tarafında beklenmeyen bir hata oluştu.";
        object? errors = null;
        
        if (exception is FluentValidation.ValidationException validationEx)
        {
            statusCode = (int)HttpStatusCode.BadRequest; 
            message = "Bir veya daha fazla doğrulama hatası oluştu.";
            
            errors = validationEx.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
        }
        else if (exception is BaseException baseEx)
        {
            statusCode = baseEx.StatusCode;
            message = baseEx.Message;
        }

        context.Response.StatusCode = statusCode;

        var responseModel = new 
        {
            StatusCode = statusCode,
            Message = message,
            Errors = errors
        };

        var options = new JsonSerializerOptions 
        { 
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull 
        };

        var result = JsonSerializer.Serialize(responseModel, options);

        return context.Response.WriteAsync(result);
    }
}