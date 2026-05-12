using RestaurantBill.Application.Interfaces;
using RestaurantBill.WebAPI.Services;

namespace RestaurantBill.WebAPI.Extensions;

public static class CurrentUserExtensions
{
    public static IServiceCollection AddCurrentUserService(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        return services;
    }
}
