using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace RestaurantBill.Infrastructure.Hubs;

[Authorize]
public class CashierHub : Hub
{
}