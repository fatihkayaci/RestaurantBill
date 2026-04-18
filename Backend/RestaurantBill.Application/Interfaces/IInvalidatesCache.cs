namespace RestaurantBill.Application.Interfaces;

public interface IInvalidatesCache
{
    string[] CacheKeysToInvalidate { get; }
}