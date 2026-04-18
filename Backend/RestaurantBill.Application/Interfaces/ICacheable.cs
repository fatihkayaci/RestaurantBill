namespace RestaurantBill.Application.Interfaces;
public interface ICacheable
{
    string CacheKey { get; }
    TimeSpan Ttl { get; }
}