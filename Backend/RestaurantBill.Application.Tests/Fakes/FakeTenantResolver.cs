using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeTenantResolver : ITenantResolver
{
    public string? Slug { get; set; }
}
