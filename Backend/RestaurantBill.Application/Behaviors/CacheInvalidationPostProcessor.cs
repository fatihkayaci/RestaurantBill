using MediatR.Pipeline;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Behaviors;
public class CacheInvalidationPostProcessor<TRequest, TResponse>
    : IRequestPostProcessor<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<CacheInvalidationPostProcessor<TRequest, TResponse>> _logger;

    public CacheInvalidationPostProcessor(IMemoryCache cache, ILogger<CacheInvalidationPostProcessor<TRequest, TResponse>> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public Task Process(TRequest request, TResponse response, CancellationToken ct)
    {
        if (request is IInvalidatesCache invalidator)
            foreach (string key in invalidator.CacheKeysToInvalidate)
            {
                _cache.Remove(key);
                _logger.LogInformation("[Cache INVALIDATED] Key: {Key}", key);
            }

        return Task.CompletedTask;
    }
}