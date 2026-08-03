using System.Security.Claims;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.WebAPI.Services;

public class CurrentUserService : ICurrentUserService
{
    public Guid BranchId { get; }
    public Guid UserId { get; }
    public string Role { get; }

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        ClaimsPrincipal? user = httpContextAccessor.HttpContext?.User;
        BranchId = Guid.TryParse(user?.FindFirst("RestaurantId")?.Value, out Guid rid) ? rid : Guid.Empty;
        UserId = Guid.TryParse(user?.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid uid) ? uid : Guid.Empty;
        Role = user?.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
    }
}
