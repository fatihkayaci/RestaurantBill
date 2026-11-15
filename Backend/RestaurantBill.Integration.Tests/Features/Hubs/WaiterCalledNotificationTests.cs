using Microsoft.AspNetCore.SignalR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Infrastructure.Hubs;
using RestaurantBill.Infrastructure.Services;

namespace RestaurantBill.Integration.Tests.Features.Hubs;

// Müşterinin QR'dan "Garson çağır"ı: "ürün hazır" ile aynı garson gruplarına (her garsona en fazla bir kez) ve şube
// yöneticilerine gider. TableNotificationService gerçek hub bağlamı yerine olayları kaydeden bir sahte bağlamla çalışır.
public class WaiterCalledNotificationTests
{
    private static readonly Guid Branch = Guid.NewGuid();
    private static readonly Guid Bahce = Guid.NewGuid();
    private static readonly Guid Salon = Guid.NewGuid();
    private static readonly Guid B1 = Guid.NewGuid();
    private static readonly Guid B2 = Guid.NewGuid();
    private static readonly Guid S1 = Guid.NewGuid();

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

    private TableNotificationService Service()
        => new(new RecordingHubContext<TableHub>(_tableHub), new RecordingHubContext<CashierHub>(_cashierHub));

    private static WaiterCalledDto Call(Guid tableId, Guid regionId)
        => new() { TableId = tableId, TableName = "B1", RegionId = regionId, RegionName = "Bahçe", CalledAt = DateTime.UtcNow };

    [Fact]
    public async Task SendWaiterCalled_GoesToItemsReadyWaiterGroups_AndBranchManagers()
    {
        WaiterCalledDto payload = Call(B1, Bahce);

        await Service().SendWaiterCalledAsync(Branch, payload);

        Sent waiters = Assert.Single(_tableHub);
        Assert.Equal("WaiterCalled", waiters.Method);
        Assert.Equal(HubGroups.ItemsReadyTargets(Branch, Bahce, B1), waiters.Groups);
        Assert.Same(payload, Assert.Single(waiters.Args));

        Sent managers = Assert.Single(_cashierHub);
        Assert.Equal("WaiterCalled", managers.Method);
        Assert.Equal([HubGroups.BranchManagers(Branch)], managers.Groups);
        // Kasiyer ekranları (Restaurant grubu) bu olayı almaz.
        Assert.DoesNotContain(HubGroups.Restaurant(Branch), managers.Groups);
    }

    // Her garson, her masa için: kapsamındaysa hedef gruplardan tam birinde, değilse hiçbirinde.
    [Theory]
    [MemberData(nameof(Cases))]
    public async Task EachWaiter_ReceivesWaiterCallAtMostOnce_AndOnlyForCoveredTables(string waiter, Guid tableId, Guid regionId, int expected)
    {
        WaiterScope? scope = waiter switch
        {
            "restricted" => WaiterScope.Resolve([Bahce, Salon], [Bahce], [(B1, Bahce)]),
            "salonOnly" => WaiterScope.Resolve([Salon], [], []),
            _ => null
        };

        await Service().SendWaiterCalledAsync(Branch, Call(tableId, regionId));

        HashSet<string> joined = HubGroups.ForWaiter(Branch, scope).ToHashSet();
        int received = Assert.Single(_tableHub).Groups.Count(joined.Contains);
        Assert.Equal(expected, received);
    }

    public static TheoryData<string, Guid, Guid, int> Cases => new()
    {
        { "restricted", B1, Bahce, 1 },
        { "restricted", B2, Bahce, 0 },
        { "restricted", S1, Salon, 1 },
        { "salonOnly", B1, Bahce, 0 },
        { "salonOnly", S1, Salon, 1 },
        { "all", B2, Bahce, 1 },
        { "all", S1, Salon, 1 },
    };
}
