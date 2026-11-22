using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Connections.Features;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Infrastructure.Hubs;
using RestaurantBill.Infrastructure.Services;
using RestaurantBill.Integration.Tests.Infrastructure;

namespace RestaurantBill.Integration.Tests.Features.Hubs;

// Customer QR page hub (/public-table-hub): an anonymous phone joins only a real table of the tenant it came from, at
// most MaxTablesPerConnection of them, and table changes reach that table's group as content-free signals.
public class PublicTableHubTests : IntegrationTestBase
{
    private const string Slug = "kafe";

    private readonly Guid _tableId;
    private readonly Guid _secondTableId;
    private readonly Guid _thirdTableId;
    private readonly Guid _otherCompanyTableId;

    public PublicTableHubTests()
    {
        (_tableId, _secondTableId, _thirdTableId) = SeedCompany(Slug, out _);
        (_otherCompanyTableId, _, _) = SeedCompany("baska-kafe", out _);
    }

    private (Guid, Guid, Guid) SeedCompany(string slug, out Guid branchId)
    {
        User owner = User.Create("Sahip", $"{slug}@test.com", "5551234567");
        DbContext.Users.Add(owner);
        Company company = Company.Create(slug, owner);
        company.Slug = slug;
        DbContext.Companies.Add(company);
        DbContext.SaveChanges();

        Branch branch = Branch.Create(company.Id, "Merkez", "", "", "", "İstanbul", "Fatih", "", 10m);
        DbContext.Branches.Add(branch);
        DbContext.SaveChanges();
        branchId = branch.Id;

        Region region = Region.Create("Salon", branch.Id);
        DbContext.Regions.Add(region);
        DbContext.SaveChanges();

        Table[] tables = [Table.Create("M1", "", region.Id), Table.Create("M2", "", region.Id), Table.Create("M3", "", region.Id)];
        DbContext.Tables.AddRange(tables);
        DbContext.SaveChanges();
        return (tables[0].Id, tables[1].Id, tables[2].Id);
    }

    // ── Hub test doubles ───────────────────────────────────────────────────────────────────────────

    private sealed class RecordingGroups : IGroupManager
    {
        public List<string> Added { get; } = [];
        public List<string> Removed { get; } = [];

        public Task AddToGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default)
        {
            Added.Add(groupName);
            return Task.CompletedTask;
        }

        public Task RemoveFromGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default)
        {
            Removed.Add(groupName);
            return Task.CompletedTask;
        }
    }

    private sealed class HttpContextFeature(HttpContext httpContext) : IHttpContextFeature
    {
        public HttpContext? HttpContext { get; set; } = httpContext;
    }

    private sealed class FakeCallerContext : HubCallerContext
    {
        private readonly FeatureCollection _features = new();

        public FakeCallerContext(string? querySlug)
        {
            var http = new DefaultHttpContext();
            if (querySlug is not null)
                http.Request.QueryString = QueryString.Create("slug", querySlug);
            _features.Set<IHttpContextFeature>(new HttpContextFeature(http));
        }

        public override string ConnectionId => "phone-1";
        public override string? UserIdentifier => null;
        public override ClaimsPrincipal? User => null;
        public override IDictionary<object, object?> Items { get; } = new Dictionary<object, object?>();
        public override IFeatureCollection Features => _features;
        public override CancellationToken ConnectionAborted => CancellationToken.None;
        public override void Abort() { }
    }

    private sealed class FakeEnvironment(string name) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = name;
        public string ApplicationName { get; set; } = "tests";
        public string ContentRootPath { get; set; } = "";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private (PublicTableHub Hub, RecordingGroups Groups) Hub(string? querySlug, string environment = "Production", string? devSlug = null)
    {
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Tenancy:DevDefaultSlug"] = devSlug })
            .Build();
        var groups = new RecordingGroups();
        var hub = new PublicTableHub(AppDb, new FakeEnvironment(environment), configuration)
        {
            Context = new FakeCallerContext(querySlug),
            Groups = groups,
        };
        return (hub, groups);
    }

    // ── Join validation ────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task JoinTable_KnownTableOfTheTenant_JoinsThePublicTableGroup()
    {
        var (hub, groups) = Hub(Slug);

        Assert.True(await hub.JoinTable(_tableId));
        Assert.Equal([HubGroups.PublicTable(_tableId)], groups.Added);
    }

    [Fact]
    public async Task JoinTable_UnknownTable_IsRejected()
    {
        var (hub, groups) = Hub(Slug);

        Assert.False(await hub.JoinTable(Guid.NewGuid()));
        Assert.False(await hub.JoinTable(Guid.Empty));
        Assert.Empty(groups.Added);
    }

    [Fact]
    public async Task JoinTable_TableOfAnotherCompany_IsRejected()
    {
        var (hub, groups) = Hub(Slug);

        Assert.False(await hub.JoinTable(_otherCompanyTableId));
        Assert.Empty(groups.Added);
    }

    [Fact]
    public async Task JoinTable_WithoutSlugOutsideDevelopment_IsRejected()
    {
        var (hub, groups) = Hub(querySlug: null, devSlug: Slug);

        Assert.False(await hub.JoinTable(_tableId));
        Assert.Empty(groups.Added);
    }

    [Fact]
    public async Task JoinTable_WithoutSlugInDevelopment_UsesTheDevDefaultTenant()
    {
        var (hub, _) = Hub(querySlug: null, environment: Environments.Development, devSlug: Slug);

        Assert.True(await hub.JoinTable(_tableId));
    }

    [Fact]
    public async Task JoinTable_OutOfServiceTable_IsRejected()
    {
        Table table = DbContext.Tables.Single(t => t.Id == _tableId);
        DbContext.Entry(table).Property(t => t.Status).CurrentValue = Domain.Enums.TableStatus.OutOfService;
        DbContext.SaveChanges();
        var (hub, _) = Hub(Slug);

        Assert.False(await hub.JoinTable(_tableId));
    }

    [Fact]
    public async Task JoinTable_IsCappedPerConnection_AndLeaveFreesASlot()
    {
        var (hub, groups) = Hub(Slug);

        Assert.True(await hub.JoinTable(_tableId));
        Assert.True(await hub.JoinTable(_secondTableId));
        Assert.Equal(PublicTableHub.MaxTablesPerConnection, groups.Added.Count);
        Assert.False(await hub.JoinTable(_thirdTableId));

        await hub.LeaveTable(_tableId);
        Assert.Equal([HubGroups.PublicTable(_tableId)], groups.Removed);
        Assert.True(await hub.JoinTable(_thirdTableId));
    }

    [Fact]
    public async Task JoinTable_StopsLookingUpAfterTooManyAttempts()
    {
        var (hub, _) = Hub(Slug);

        for (int i = 0; i < PublicTableHub.MaxJoinAttemptsPerConnection; i++)
            Assert.False(await hub.JoinTable(Guid.NewGuid()));

        Assert.False(await hub.JoinTable(_tableId));
    }

    // ── Signals from TableNotificationService ─────────────────────────────────────────────────────

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

    private readonly List<Sent> _staff = [];
    private readonly List<Sent> _public = [];

    private TableNotificationService Notifications()
        => new(new RecordingHubContext<TableHub>(_staff), new RecordingHubContext<CashierHub>(_staff), new RecordingHubContext<PublicTableHub>(_public));

    private static readonly Guid BranchKey = Guid.NewGuid();

    public static TheoryData<string, string> TableChanges => new()
    {
        { "order", TableNotificationService.BillChangeReasons.Order },
        { "closed", TableNotificationService.BillChangeReasons.Closed },
        { "status", TableNotificationService.BillChangeReasons.TableStatus },
        { "billRequest", TableNotificationService.BillChangeReasons.BillRequest },
        { "qrLock", TableNotificationService.BillChangeReasons.QrLock },
    };

    [Theory]
    [MemberData(nameof(TableChanges))]
    public async Task TableChanges_SignalOnlyTheTablesPublicGroup_WithTableIdAndReason(string change, string reason)
    {
        TableNotificationService service = Notifications();
        Guid tableId = _tableId;

        Task send = change switch
        {
            "order" => service.SendOrderUpdatedAsync(BranchKey, tableId, 250m, "Garson Ali"),
            "closed" => service.SendOrderClosedAsync(BranchKey, tableId, Guid.NewGuid()),
            "status" => service.SendTableStatusChangedAsync(BranchKey, tableId, 1),
            "billRequest" => service.SendBillRequestChangedAsync(BranchKey, tableId, DateTime.UtcNow),
            _ => service.SendTableQrLockChangedAsync(BranchKey, tableId, true),
        };
        await send;

        Sent signal = Assert.Single(_public);
        Assert.Equal("TableBillChanged", signal.Method);
        Assert.Equal([HubGroups.PublicTable(tableId)], signal.Groups);
        // Only the table id and the reason: no totals, staff names or items.
        Assert.Equal([tableId, reason], signal.Args);
        // Staff screens still get their own event.
        Assert.Single(_staff);
    }

    [Fact]
    public async Task OrderRequestDecided_SignalsRequestsAndBill_WithoutRequestId()
    {
        await Notifications().SendOrderRequestDecidedAsync(BranchKey, _tableId);

        Assert.Equal(["OrderRequestChanged", "TableBillChanged"], _public.Select(s => s.Method));
        Assert.All(_public, s => Assert.Equal([HubGroups.PublicTable(_tableId)], s.Groups));
        Assert.Equal([_tableId], _public[0].Args);
        Assert.Empty(_staff);
    }

    [Fact]
    public async Task NewOrderRequest_TellsTheOtherPhonesAtTheTable()
    {
        await Notifications().SendOrderRequestCreatedAsync(BranchKey, new OrderRequestCreatedDto
        {
            RequestId = Guid.NewGuid(), TableId = _tableId, TableName = "M1", RegionId = Guid.NewGuid(), RegionName = "Salon", ItemCount = 2,
        });

        Sent signal = Assert.Single(_public);
        Assert.Equal("TableBillChanged", signal.Method);
        Assert.Equal([_tableId, TableNotificationService.BillChangeReasons.Request], signal.Args);
    }

    [Fact]
    public async Task StaffOnlyEvents_DoNotReachThePublicHub()
    {
        TableNotificationService service = Notifications();
        var regionId = Guid.NewGuid();

        await service.SendItemsReadyAsync(BranchKey, new ItemsReadyDto { TableId = _tableId, RegionId = regionId });
        await service.SendWaiterCalledAsync(BranchKey, new WaiterCalledDto { TableId = _tableId, RegionId = regionId, TableName = "M1", RegionName = "Salon" });
        await service.SendCustomerRequestsChangedAsync(BranchKey);

        Assert.Empty(_public);
    }
}
