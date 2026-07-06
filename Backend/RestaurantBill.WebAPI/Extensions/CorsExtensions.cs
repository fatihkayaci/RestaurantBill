namespace RestaurantBill.WebAPI.Extensions;

public static class CorsExtensions
{
    public static IServiceCollection AddCorsPolicy(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            string[] allowedOrigins =
            [
                "http://localhost:5173",
                "http://localhost",
                "http://165.245.222.71",
                "http://64.226.125.22",
                "https://bill.fatihkayaci.com"
            ];

            options.AddPolicy("Allow", policy =>
            {
                policy.SetIsOriginAllowed(origin =>
                          allowedOrigins.Contains(origin) ||
                          origin.EndsWith(".bill.fatihkayaci.com", StringComparison.OrdinalIgnoreCase)
                      )
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            });
        });

        return services;
    }
}
