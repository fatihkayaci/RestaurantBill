namespace RestaurantBill.WebAPI.Extensions;

public static class CorsExtensions
{
    public static IServiceCollection AddCorsPolicy(this IServiceCollection services, IConfiguration configuration)
    {
        var corsSettings = configuration.GetSection(CorsSettings.SectionName).Get<CorsSettings>() ?? new CorsSettings();

        string[] allowedOrigins = corsSettings.AllowedOrigins
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        string[] allowedOriginSuffixes = corsSettings.AllowedOriginSuffix
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        services.AddCors(options =>
        {
            options.AddPolicy("Allow", policy =>
            {
                policy.SetIsOriginAllowed(origin =>
                          allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase) ||
                          allowedOriginSuffixes.Any(suffix => origin.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
                      )
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            });
        });

        return services;
    }
}
