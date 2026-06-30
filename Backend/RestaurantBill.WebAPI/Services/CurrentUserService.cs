using System.Security.Claims;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.WebAPI.Services;

public class CurrentUserService : ICurrentUserService
{
    public int RestaurantId { get; }
    public int UserId { get; }
    public string Role { get; }

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        ClaimsPrincipal? user = httpContextAccessor.HttpContext?.User;
        RestaurantId = int.TryParse(user?.FindFirst("RestaurantId")?.Value, out int rid) ? rid : 0;
        UserId = int.TryParse(user?.FindFirst(ClaimTypes.NameIdentifier)?.Value, out int uid) ? uid : 0;
        Role = user?.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
    }
}
