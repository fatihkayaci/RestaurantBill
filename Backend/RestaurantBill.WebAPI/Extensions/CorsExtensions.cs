namespace RestaurantBill.WebAPI.Extensions;

public static class CorsExtensions
{
    public static IServiceCollection AddCorsPolicy(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("Allow", policy =>
            {
                policy.WithOrigins(
                          "http://localhost:5173",
                          "http://localhost",
                          "http://165.245.222.71",
                          "http://64.226.125.22"
                      )
                      .AllowAnyHeader()
                      .AllowAnyMethod();
            });
        });

        return services;
    }
}
