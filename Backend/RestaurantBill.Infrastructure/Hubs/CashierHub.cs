using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Infrastructure.Hubs;

[Authorize]
public class CashierHub : Hub
{
    private readonly IAppDbContext _db;

    public CashierHub(IAppDbContext db)
    {
        _db = db;
    }

    public override async Task OnConnectedAsync()
    {
        string? restaurantId = Context.User?.FindFirst("RestaurantId")?.Value;
        if (Guid.TryParse(restaurantId, out Guid id))
        {
            WaiterScope? cashierScope = Context.User?.IsInRole("Cashier") == true ? await GetCashierScopeAsync(id) : null;
            foreach (string group in HubGroups.ForCashierHub(id, role => Context.User?.IsInRole(role) == true, cashierScope))
                await Groups.AddToGroupAsync(Context.ConnectionId, group);
        }

        await base.OnConnectedAsync();
    }

    // Kasiyerin bölgeleri ve masaları bağlantı anında okunur (garsonda olduğu gibi, bkz. TableHub); yöneticinin
    // değişikliği kasiyerin bağlantısı yeniden kurulunca geçerli olur. Üyelik yoksa hiçbir masa grubuna girmez.
    private async Task<WaiterScope?> GetCashierScopeAsync(Guid branchId)
    {
        if (!Guid.TryParse(Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid userId))
            return WaiterScope.Empty;

        var membership = await _db.UserBranches.AsNoTracking()
            .Where(ub => ub.UserId == userId && ub.BranchId == branchId && !ub.IsDeleted)
            .Select(ub => new { ub.RegionIds, ub.RestrictedRegionIds, ub.TableIds })
            .FirstOrDefaultAsync(Context.ConnectionAborted);
        if (membership is null)
            return WaiterScope.Empty;

        return await _db.GetWaiterScopeAsync(
            membership.RegionIds, membership.RestrictedRegionIds, membership.TableIds, Context.ConnectionAborted);
    }
}
