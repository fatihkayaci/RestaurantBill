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
            var (cashierScope, canViewDelivery) = Context.User?.IsInRole("Cashier") == true
                ? await GetCashierAccessAsync(id)
                : (null, true);
            foreach (string group in HubGroups.ForCashierHub(id, role => Context.User?.IsInRole(role) == true, cashierScope, canViewDelivery))
                await Groups.AddToGroupAsync(Context.ConnectionId, group);
        }

        await base.OnConnectedAsync();
    }

    // Kasiyerin bölgeleri ve masaları bağlantı anında okunur (garsonda olduğu gibi, bkz. TableHub); yöneticinin
    // değişikliği kasiyerin bağlantısı yeniden kurulunca geçerli olur. Üyelik yoksa hiçbir masa grubuna ve paket
    // sipariş grubuna girmez. "Paket siparişler" yetkisi de aynı anda okunur.
    private async Task<(WaiterScope? Scope, bool CanViewDelivery)> GetCashierAccessAsync(Guid branchId)
    {
        if (!Guid.TryParse(Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid userId))
            return (WaiterScope.Empty, false);

        var membership = await _db.UserBranches.AsNoTracking()
            .Where(ub => ub.UserId == userId && ub.BranchId == branchId && !ub.IsDeleted)
            .Select(ub => new { ub.RegionIds, ub.RestrictedRegionIds, ub.TableIds, ub.CanViewDelivery })
            .FirstOrDefaultAsync(Context.ConnectionAborted);
        if (membership is null)
            return (WaiterScope.Empty, false);

        WaiterScope? scope = await _db.GetWaiterScopeAsync(
            membership.RegionIds, membership.RestrictedRegionIds, membership.TableIds, Context.ConnectionAborted);
        return (scope, membership.CanViewDelivery);
    }
}
