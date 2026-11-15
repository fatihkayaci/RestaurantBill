using Microsoft.AspNetCore.SignalR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Infrastructure.Hubs;
using RestaurantBill.Infrastructure.Services;

namespace RestaurantBill.Integration.Tests.Features.Hubs;

// Online (paket) sipariş olayları yalnızca kasiyer hub'ının OnlineOrders grubuna gider: kasiyer, Admin ve Owner.
// Garson, mutfak ve kurye bu grupta değildir.
public class DeliveryNotificationTests
{
    private static readonly Guid Branch = Guid.NewGuid();

    private sealed record Sent(IReadOnlyList<string> Groups, string Method, object?[] Args);

    private sealed class RecordingProxy(IReadOnlyList<string> groups, List<Sent> log) : IClientProxy
    {
        public Task SendCoreAsync(string method, object?[] args, CancellationToken cancellationToken = default)
        {
            log.Add(new Sent(groups, method, args));
            return Task.CompletedTask;
        }
    }

    private sealed class RecordingClients(List<Sent> log) : IHubClients
    {
        public IClientProxy All => throw new NotSupportedException();
        public IClientProxy AllExcept(IReadOnlyList<string> excludedConnectionIds) => throw new NotSupportedException();
        public IClientProxy Client(string connectionId) => throw new NotSupportedException();
        public IClientProxy Clients(IReadOnlyList<string> connectionIds) => throw new NotSupportedException();
        public IClientProxy Group(string groupName) => new RecordingProxy([groupName], log);
        public IClientProxy GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => throw new NotSupportedException();
        public IClientProxy Groups(IReadOnlyList<string> groupNames) => new RecordingProxy(groupNames, log);
        public IClientProxy User(string userId) => throw new NotSupportedException();
        public IClientProxy Users(IReadOnlyList<string> userIds) => throw new NotSupportedException();
    }

    private sealed class RecordingHubContext<THub>(List<Sent> log) : IHubContext<THub> where THub : Hub
    {
        public IHubClients Clients { get; } = new RecordingClients(log);
        public IGroupManager Groups => throw new NotSupportedException();
    }

    private readonly List<Sent> _tableHub = [];
    private readonly List<Sent> _cashierHub = [];
    private readonly List<Sent> _kitchenHub = [];

    [Fact]
    public async Task DeliveryOrdersChanged_GoesOnlyToOnlineOrdersGroup()
    {
        var service = new CashierNotificationService(new RecordingHubContext<CashierHub>(_cashierHub));
        var payload = new DeliveryOrdersChangedDto { Id = Guid.NewGuid(), Status = DeliveryOrderStatus.Received, IsNew = true };

        await service.SendDeliveryOrdersChangedAsync(Branch, payload);

        Sent sent = Assert.Single(_cashierHub);
        Assert.Equal("DeliveryOrdersChanged", sent.Method);
        Assert.Equal([HubGroups.OnlineOrders(Branch)], sent.Groups);
        Assert.Same(payload, Assert.Single(sent.Args));
    }

    [Fact]
    public async Task DeliveryItemsReady_GoesToOnlineOrders_NotToWaiters()
    {
        var service = new TableNotificationService(new RecordingHubContext<TableHub>(_tableHub), new RecordingHubContext<CashierHub>(_cashierHub));
        var payload = new ItemsReadyDto { OrderId = Guid.NewGuid(), TableName = "PAKET #7 · Moda", DeliveryNumber = 7, ReadyAt = DateTime.UtcNow };

        await service.SendDeliveryItemsReadyAsync(Branch, payload);

        Assert.Empty(_tableHub);
        Sent sent = Assert.Single(_cashierHub);
        Assert.Equal("ItemsReady", sent.Method);
        Assert.Equal([HubGroups.OnlineOrders(Branch)], sent.Groups);
    }

    [Fact]
    public async Task KitchenNotification_PingsKitchenScreens()
    {
        var service = new KitchenNotificationService(new RecordingHubContext<KitchenHub>(_kitchenHub));

        await service.SendOrdersChangedAsync(Branch);

        Sent sent = Assert.Single(_kitchenHub);
        Assert.Equal("ReceiveNewOrder", sent.Method);
        Assert.Equal([HubGroups.Restaurant(Branch)], sent.Groups);
    }

    [Theory]
    [InlineData("Cashier", true, false)]
    [InlineData("Admin", true, true)]
    [InlineData("Owner", true, true)]
    [InlineData("Waiter", false, false)]
    [InlineData("Kitchen", false, false)]
    [InlineData("Courier", false, false)]
    public void CashierHubGroups_OnlineOrdersForCashierAdminOwner(string role, bool onlineOrders, bool managers)
    {
        List<string> groups = HubGroups.ForCashierHub(Branch, r => r == role);

        Assert.Contains(HubGroups.Restaurant(Branch), groups);
        Assert.Equal(onlineOrders, groups.Contains(HubGroups.OnlineOrders(Branch)));
        Assert.Equal(managers, groups.Contains(HubGroups.BranchManagers(Branch)));
    }
}
