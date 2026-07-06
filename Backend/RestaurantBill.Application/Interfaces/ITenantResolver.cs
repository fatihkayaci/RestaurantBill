namespace RestaurantBill.Application.Interfaces;

public interface ITenantResolver
{
    string? Slug { get; }
}
