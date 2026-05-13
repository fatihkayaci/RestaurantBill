using MediatR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Behaviors;
public class IdempotencyBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<IdempotencyBehavior<TRequest, TResponse>> _logger;
    private readonly ICurrentUserService _currentUser;

    public IdempotencyBehavior(IMemoryCache cache, ILogger<IdempotencyBehavior<TRequest, TResponse>> logger, ICurrentUserService currentUser)
    {
        _cache = cache;
        _logger = logger;
        _currentUser = currentUser;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (request is not IIdempotent idempotent)
            return await next();

        var key = $"idempotency:r{_currentUser.RestaurantId}:{idempotent.IdempotencyKey}";

        if (_cache.TryGetValue(key, out _))
        {
            _logger.LogWarning("Duplicate request blocked: {Key}", key);
            return default!;
        }

        var response = await next();

        _cache.Set(key, true, TimeSpan.FromMinutes(5));

        return response;
    }
}