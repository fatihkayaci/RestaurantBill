using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Exceptions;
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
        catch (DomainException ex)
        {
            _logger.LogWarning(ex, "İş kuralı ihlali: {ErrorMessage}", ex.Message);
            await HandleExceptionAsync(httpContext, ex);
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex, "Eşzamanlı güncelleme çakışması: {Path}", httpContext.Request.Path);
            await HandleExceptionAsync(httpContext, ex);
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
        
        if (exception is BaseException baseEx)
        {
            statusCode = baseEx.StatusCode;
            message = baseEx.Message;
        }
        else if (exception is DomainException domainEx)
        {
            statusCode = (int)HttpStatusCode.BadRequest;
            message = domainEx.Message;
        }
        else if (exception is DbUpdateConcurrencyException)
        {
            statusCode = (int)HttpStatusCode.Conflict;
            message = "Bu kayıt siz işlem yaparken başka biri tarafından değiştirildi. Lütfen sayfayı yenileyip tekrar deneyin.";
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