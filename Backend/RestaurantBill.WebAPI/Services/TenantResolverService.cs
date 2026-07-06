using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.WebAPI.Services;

public class TenantResolverService : ITenantResolver
{
    public string? Slug { get; }

    public TenantResolverService(IHttpContextAccessor httpContextAccessor, IWebHostEnvironment environment, IConfiguration configuration)
    {
        string? headerSlug = httpContextAccessor.HttpContext?.Request.Headers["X-Restaurant-Slug"].FirstOrDefault();

        if (!string.IsNullOrWhiteSpace(headerSlug))
        {
            Slug = headerSlug;
        }
        else if (environment.IsDevelopment())
        {
            Slug = configuration["Tenancy:DevDefaultSlug"];
        }
        else
        {
            Slug = null;
        }
    }
}
