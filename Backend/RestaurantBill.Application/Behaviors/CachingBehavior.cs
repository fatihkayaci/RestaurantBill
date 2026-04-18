using MediatR;
using Microsoft.Extensions.Caching.Memory;
using RestaurantBill.Application.Interfaces;
namespace RestaurantBill.Application.Behaviors;
public class CachingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IMemoryCache _cache;

    public CachingBehavior(IMemoryCache cache)
    {
        _cache = cache;
    }
    public async Task<TResponse> Handle(TRequest request, 
        RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (request is not ICacheable cacheable)
            return await next();

        if (_cache.TryGetValue(cacheable.CacheKey, out TResponse? cached))
            return cached!;

        var response = await next();

        _cache.Set(cacheable.CacheKey, response, cacheable.Ttl);

        return response;
    }
}