using Microsoft.AspNetCore.SignalR;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Infrastructure.Hubs;
using RestaurantBill.Infrastructure.Services;

namespace RestaurantBill.Integration.Tests.Features.Hubs;

// Kurye hub'ı: kurye yalnızca kendi grubuna girer, başka kuryenin olayını almaz; Admin/Owner şubenin tüm kurye olaylarını
// izler. Kasiyer, garson ve mutfak bu hub'a hiç girmez (hub [Authorize(Roles = "Courier,Admin,Owner")]).
public class CourierHubTests
{
    private static readonly Guid Branch = Guid.NewGuid();
    private static readonly Guid Kaan = Guid.NewGuid();
    private static readonly Guid Mert = Guid.NewGuid();

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

    [Fact]
    public void Courier_JoinsOnlyOwnGroup()
    {
        List<string> groups = HubGroups.ForCourierHub(Branch, Kaan, role => role == "Courier");

        Assert.Equal([HubGroups.Courier(Branch, Kaan)], groups);
        Assert.DoesNotContain(HubGroups.Courier(Branch, Mert), groups);
        Assert.DoesNotContain(HubGroups.Couriers(Branch), groups);
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData("Owner")]
    public void Managers_JoinBranchCouriersGroup_NotAPersonalOne(string role)
    {
        List<string> groups = HubGroups.ForCourierHub(Branch, Kaan, r => r == role);

        Assert.Equal([HubGroups.Couriers(Branch)], groups);
    }

    [Theory]
    [InlineData("Cashier")]
    [InlineData("Waiter")]
    [InlineData("Kitchen")]
    public void OtherRoles_JoinNoGroup(string role)
    {
        Assert.Empty(HubGroups.ForCourierHub(Branch, Kaan, r => r == role));
    }

    [Fact]
    public void Courier_WithoutUserId_JoinsNoGroup()
    {
        Assert.Empty(HubGroups.ForCourierHub(Branch, null, role => role == "Courier"));
    }

    [Fact]
    public void Groups_AreBranchScoped()
    {
        Guid other = Guid.NewGuid();
        Assert.NotEqual(HubGroups.Courier(Branch, Kaan), HubGroups.Courier(other, Kaan));
        Assert.NotEqual(HubGroups.Couriers(Branch), HubGroups.Couriers(other));
    }

    [Fact]
    public async Task CourierOrdersChanged_GoesToThatCourierAndBranchManagers_Only()
    {
        List<Sent> log = [];
        var service = new CourierNotificationService(new RecordingHubContext<CourierHub>(log));
        Guid deliveryOrderId = Guid.NewGuid();

        await service.SendCourierOrdersChangedAsync(Branch, Kaan, deliveryOrderId);

        Sent sent = Assert.Single(log);
        Assert.Equal("CourierOrdersChanged", sent.Method);
        Assert.Equal([HubGroups.Courier(Branch, Kaan), HubGroups.Couriers(Branch)], sent.Groups);
        Assert.DoesNotContain(HubGroups.Courier(Branch, Mert), sent.Groups);
        var payload = Assert.IsType<CourierOrdersChangedDto>(Assert.Single(sent.Args));
        Assert.Equal(Kaan, payload.CourierUserId);
        Assert.Equal(deliveryOrderId, payload.DeliveryOrderId);
    }
}
