using System.Threading.RateLimiting;

namespace RestaurantBill.WebAPI.Extensions;

public static class RateLimitingExtensions
{
    public static IServiceCollection AddAuthRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.AddPolicy("auth", context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));

            // Müşteri sitesi (girişsiz uçlar): okuma bol, yazma (sipariş/rezervasyon talebi) sıkı.
            options.AddPolicy("public-read", context => PerClientWindow(context, "public-read", 120));
            options.AddPolicy("public-write", context => PerClientWindow(context, "public-write", 20));

            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        });

        return services;
    }

    // Sunucuda API nginx arkasında çalışır; bağlantı adresi hep 127.0.0.1 olur ve tüm müşteriler tek
    // kovaya düşer. Bu yüzden önce proxy'nin yazdığı X-Forwarded-For'un ilk adresine bakılır.
    private static RateLimitPartition<string> PerClientWindow(HttpContext context, string policy, int permitLimit)
    {
        string? forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim();
        string client = !string.IsNullOrWhiteSpace(forwarded)
            ? forwarded
            : context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"{policy}:{client}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    }
}
