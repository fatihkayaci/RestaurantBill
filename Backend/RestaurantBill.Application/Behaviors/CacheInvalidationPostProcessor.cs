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
    private readonly ICurrentUserService _currentUser;

    public CacheInvalidationPostProcessor(IMemoryCache cache, ILogger<CacheInvalidationPostProcessor<TRequest, TResponse>> logger, ICurrentUserService currentUser)
    {
        _cache = cache;
        _logger = logger;
        _currentUser = currentUser;
    }

    public Task Process(TRequest request, TResponse response, CancellationToken ct)
    {
        if (request is IInvalidatesCache invalidator)
            foreach (string key in invalidator.CacheKeysToInvalidate)
            {
                string fullKey = $"{key}:{_currentUser.RestaurantId}";
                _cache.Remove(fullKey);
                _logger.LogInformation("[Cache INVALIDATED] Key: {Key}", fullKey);
            }

        return Task.CompletedTask;
    }
}