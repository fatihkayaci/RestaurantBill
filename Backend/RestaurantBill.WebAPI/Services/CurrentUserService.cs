using System.Security.Claims;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.WebAPI.Services;

public class CurrentUserService : ICurrentUserService
{
    public int RestaurantId { get; }
    public string UserId { get; }
    public string Role { get; }

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        ClaimsPrincipal? user = httpContextAccessor.HttpContext?.User;
        RestaurantId = int.TryParse(user?.FindFirst("RestaurantId")?.Value, out int rid) ? rid : 0;
        UserId = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        Role = user?.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
    }

}
