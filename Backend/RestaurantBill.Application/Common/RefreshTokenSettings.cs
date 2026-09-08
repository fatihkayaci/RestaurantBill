using Microsoft.Extensions.Configuration;

namespace RestaurantBill.Application.Common;

public class RefreshTokenSettings
{
    public int SessionDays { get; init; } = 1;
    public int RememberMeDays { get; init; } = 30;

    public static RefreshTokenSettings FromConfiguration(IConfiguration configuration) => new()
    {
        SessionDays = configuration.GetValue<int?>("RefreshTokenSettings:SessionDays") ?? 1,
        RememberMeDays = configuration.GetValue<int?>("RefreshTokenSettings:RememberMeDays") ?? 30
    };

    public TimeSpan LifetimeFor(bool rememberMe)
        => TimeSpan.FromDays(rememberMe ? RememberMeDays : SessionDays);
}
