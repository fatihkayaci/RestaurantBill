using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using RestaurantBill.Application.Features.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Infrastructure.Hubs;

// Anonymous hub for the customer QR table page (/public-table-hub). The page calls JoinTable(tableId) and then only
// receives content-free signals for that table: "TableBillChanged"(tableId, reason) and "OrderRequestChanged"(tableId).
// Neither carries items, totals, names or request ids; the page re-reads the existing public endpoints, which apply the
// privacy rules (device token, paid-bill window). The tenant comes from the "slug" query parameter (browsers cannot set
// headers on the WebSocket request) or the X-Restaurant-Slug header, with the same Development fallback as the public API.
[AllowAnonymous]
public class PublicTableHub(IAppDbContext db, IHostEnvironment environment, IConfiguration configuration) : Hub
{
    /// <summary>A phone watches one table; two leaves room for a quick switch before LeaveTable arrives.</summary>
    public const int MaxTablesPerConnection = 2;
    /// <summary>Join attempts per connection (each is a database lookup); a real page needs one or two.</summary>
    public const int MaxJoinAttemptsPerConnection = 10;

    private const string JoinedKey = "public-table:joined";
    private const string AttemptsKey = "public-table:attempts";

    /// <summary>true: the connection now receives this table's signals; false: unknown table, wrong tenant or limit reached.</summary>
    public async Task<bool> JoinTable(Guid tableId)
    {
        HashSet<Guid> joined = Joined();
        if (joined.Contains(tableId))
            return true;

        int attempts = Context.Items.TryGetValue(AttemptsKey, out object? value) && value is int count ? count : 0;
        if (tableId == Guid.Empty || joined.Count >= MaxTablesPerConnection || attempts >= MaxJoinAttemptsPerConnection)
            return false;
        Context.Items[AttemptsKey] = attempts + 1;

        string? slug = ResolveSlug();
        if (slug is null)
            return false;

        // Same rule as every public table endpoint: the tenant's company, a live branch, a table not out of service.
        Table? table = await CustomerSiteScope.ResolveTableAsync(db, new FixedTenant(slug), tableId, Context.ConnectionAborted);
        if (table is null)
            return false;

        await Groups.AddToGroupAsync(Context.ConnectionId, HubGroups.PublicTable(tableId), Context.ConnectionAborted);
        joined.Add(tableId);
        return true;
    }

    public async Task LeaveTable(Guid tableId)
    {
        if (!Joined().Remove(tableId))
            return;
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, HubGroups.PublicTable(tableId), Context.ConnectionAborted);
    }

    private HashSet<Guid> Joined()
    {
        if (Context.Items.TryGetValue(JoinedKey, out object? value) && value is HashSet<Guid> set)
            return set;
        HashSet<Guid> created = [];
        Context.Items[JoinedKey] = created;
        return created;
    }

    private string? ResolveSlug()
    {
        HttpContext? http = Context.GetHttpContext();
        string? slug = http?.Request.Query["slug"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(slug))
            slug = http?.Request.Headers["X-Restaurant-Slug"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(slug) && environment.IsDevelopment())
            slug = configuration["Tenancy:DevDefaultSlug"];
        return string.IsNullOrWhiteSpace(slug) ? null : slug.Trim();
    }

    private sealed class FixedTenant(string slug) : ITenantResolver
    {
        public string? Slug { get; } = slug;
    }
}
