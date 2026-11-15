using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Infrastructure.Hubs
{
    [Authorize]
    public class TableHub : Hub
    {
        private readonly IAppDbContext _db;

        public TableHub(IAppDbContext db)
        {
            _db = db;
        }

        public override async Task OnConnectedAsync()
        {
            string? restaurantId = Context.User?.FindFirst("RestaurantId")?.Value;
            if (Guid.TryParse(restaurantId, out Guid id))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, HubGroups.Restaurant(id));

                if (Context.User?.IsInRole("Waiter") == true)
                    await AddToWaiterGroupsAsync(id);
            }

            await base.OnConnectedAsync();
        }

        // Garsonun bölgeleri ve masaları bağlantı anında okunur. Yönetici bölgeleri ya da masaları değiştirirse yenisi
        // garsonun bağlantısı yeniden kurulunca (sayfa yenileme, yeniden bağlanma) geçerli olur.
        private async Task AddToWaiterGroupsAsync(Guid branchId)
        {
            if (!Guid.TryParse(Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid userId))
                return;

            var membership = await _db.UserBranches.AsNoTracking()
                .Where(ub => ub.UserId == userId && ub.BranchId == branchId && !ub.IsDeleted)
                .Select(ub => new { ub.RegionIds, ub.RestrictedRegionIds, ub.TableIds })
                .FirstOrDefaultAsync(Context.ConnectionAborted);

            // Üyelik yoksa (silinmiş/taşınmış garson) hiçbir garson grubuna girmez.
            if (membership is null)
                return;

            WaiterScope? scope = await _db.GetWaiterScopeAsync(
                membership.RegionIds, membership.RestrictedRegionIds, membership.TableIds, Context.ConnectionAborted);
            foreach (string group in HubGroups.ForWaiter(branchId, scope))
                await Groups.AddToGroupAsync(Context.ConnectionId, group);
        }
    }
}
