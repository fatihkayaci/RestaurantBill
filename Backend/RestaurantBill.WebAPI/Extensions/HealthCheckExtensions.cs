using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.WebAPI.Extensions;

public static class HealthCheckExtensions
{
    public static IServiceCollection AddHealthCheck(this IServiceCollection services)
    {
        services.AddHealthChecks()
            .AddDbContextCheck<RestaurantBillDbContext>();

        return services;
    }

    public static IEndpointRouteBuilder MapHealthCheck(this IEndpointRouteBuilder app)
    {
        app.MapHealthChecks("/health");
        return app;
    }
}
