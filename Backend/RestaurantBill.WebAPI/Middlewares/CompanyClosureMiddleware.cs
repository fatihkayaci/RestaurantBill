using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.WebAPI.Middlewares;

// Sahip hesabı kapattıysa şirketin bütün oturumları hemen durur: access token'ın süresi dolmasını beklemeden (en çok
// 15 dk) her istek 403 "company_closed" alır. Sahip yalnızca giriş/çıkış ve kapanış ekranının uçlarını (durum, vazgeç)
// kullanabilir; personel hiçbirini. SignalR bağlantı istekleri de buradan geçer.
public class CompanyClosureMiddleware
{
    public const string ErrorCode = "company_closed";
    public const string Message = "Bu restoran artık hizmet vermiyor.";

    private static readonly string[] OwnerAllowedPrefixes = ["/api/auth", "/api/company/closure"];
    private static readonly string[] StaffAllowedPrefixes = ["/api/auth"];

    private readonly RequestDelegate _next;

    public CompanyClosureMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, CompanyClosureCache cache, IAppDbContext db, TimeProvider clock)
    {
        ClaimsPrincipal user = context.User;
        if (user.Identity?.IsAuthenticated != true
            || !Guid.TryParse(user.FindFirst("CompanyId")?.Value, out Guid companyId)
            || companyId == Guid.Empty)
        {
            await _next(context);
            return;
        }

        bool isOwner = user.FindFirst(ClaimTypes.Role)?.Value == "Owner";
        string path = context.Request.Path.Value ?? string.Empty;
        string[] allowed = isOwner ? OwnerAllowedPrefixes : StaffAllowedPrefixes;
        if (allowed.Any(prefix => path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)))
        {
            await _next(context);
            return;
        }

        DateTime now = clock.GetUtcNow().UtcDateTime;
        if (!cache.TryGet(companyId, now, out bool closed))
        {
            closed = await db.Companies.AsNoTracking()
                .AnyAsync(c => c.Id == companyId && c.ClosedAt != null, context.RequestAborted);
            cache.Set(companyId, closed, now);
        }

        if (!closed)
        {
            await _next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(new { error = Message, code = ErrorCode }, context.RequestAborted);
    }
}
