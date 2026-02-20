using System.Net;
using System.Text.Json;
using RestaurantBill.Application.Exceptions;

namespace RestaurantBill.WebAPI.Middlewares;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;

    public ExceptionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext httpContext)
    {
        try
        {
            await _next(httpContext);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(httpContext, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        
        // Varsayılan olarak 500 (Sunucu Hatası) kabul ediyoruz
        int statusCode = (int)HttpStatusCode.InternalServerError;
        string message = "Internal Server Error from the custom middleware.";

        // Eğer fırlatılan hata bizim yazdığımız BaseException türündeyse
        if (exception is BaseException baseEx)
        {
            statusCode = baseEx.StatusCode;
            message = baseEx.Message;
        }

        context.Response.StatusCode = statusCode;

        // Kullanıcıya dönecek JSON formatını belirliyoruz
        var result = JsonSerializer.Serialize(new 
        {
            StatusCode = statusCode,
            Message = message
        });

        return context.Response.WriteAsync(result);
    }
}