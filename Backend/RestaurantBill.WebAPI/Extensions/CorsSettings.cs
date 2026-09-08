namespace RestaurantBill.WebAPI.Extensions;

public class CorsSettings
{
    public const string SectionName = "CorsSettings";

    public string AllowedOrigins { get; set; } = string.Empty;
    public string AllowedOriginSuffix { get; set; } = string.Empty;
}
