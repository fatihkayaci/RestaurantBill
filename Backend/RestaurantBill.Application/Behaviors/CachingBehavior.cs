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
    private readonly ICurrentUserService _currentUser;

    public CachingBehavior(IMemoryCache cache, ILogger<CachingBehavior<TRequest, TResponse>> logger, ICurrentUserService currentUser)
    {
        _cache = cache;
        _logger = logger;
        _currentUser = currentUser;
    }
    public async Task<TResponse> Handle(TRequest request,
        RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (request is not ICacheable cacheable)
            return await next();

        string cacheKey = $"{cacheable.CacheKey}:{_currentUser.RestaurantId}";

        if (_cache.TryGetValue(cacheKey, out TResponse? cached))
        {
            _logger.LogInformation("[Cache HIT] Key: {Key}", cacheKey);
            return cached!;
        }

        _logger.LogInformation("[Cache MISS] Key: {Key} — going to DB", cacheKey);
        var response = await next();

        _cache.Set(cacheKey, response, cacheable.Ttl);
        _logger.LogInformation("[Cache SET] Key: {Key}, TTL: {Ttl}s", cacheKey, cacheable.Ttl.TotalSeconds);

        return response;
    }
}