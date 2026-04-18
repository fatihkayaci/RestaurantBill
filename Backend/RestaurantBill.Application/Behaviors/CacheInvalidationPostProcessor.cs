using MediatR.Pipeline;
using Microsoft.Extensions.Caching.Memory;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Behaviors;
public class CacheInvalidationPostProcessor<TRequest, TResponse>
    : IRequestPostProcessor<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IMemoryCache _cache;

    public CacheInvalidationPostProcessor(IMemoryCache cache)
    {
        _cache = cache;
    }

    public Task Process(TRequest request, TResponse response, CancellationToken ct)
    {
        if (request is IInvalidatesCache invalidator)
            foreach (var key in invalidator.CacheKeysToInvalidate)
                _cache.Remove(key);

        return Task.CompletedTask;
    }
}