using MediatR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using RestaurantBill.Application.Interfaces;
namespace RestaurantBill.Application.Behaviors;
public class CachingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<CachingBehavior<TRequest, TResponse>> _logger;

    public CachingBehavior(IMemoryCache cache, ILogger<CachingBehavior<TRequest, TResponse>> logger)
    {
        _cache = cache;
        _logger = logger;
    }
    public async Task<TResponse> Handle(TRequest request,
        RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (request is not ICacheable cacheable)
            return await next();

        if (_cache.TryGetValue(cacheable.CacheKey, out TResponse? cached))
        {
            _logger.LogInformation("[Cache HIT] Key: {Key}", cacheable.CacheKey);
            return cached!;
        }

        _logger.LogInformation("[Cache MISS] Key: {Key} — going to DB", cacheable.CacheKey);
        var response = await next();

        _cache.Set(cacheable.CacheKey, response, cacheable.Ttl);
        _logger.LogInformation("[Cache SET] Key: {Key}, TTL: {Ttl}s", cacheable.CacheKey, cacheable.Ttl.TotalSeconds);

        return response;
    }
}