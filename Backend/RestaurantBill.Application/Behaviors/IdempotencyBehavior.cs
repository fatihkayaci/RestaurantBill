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

    public IdempotencyBehavior(IMemoryCache cache, ILogger<IdempotencyBehavior<TRequest, TResponse>> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (request is not IIdempotent idempotent)
            return await next();

        var key = $"idempotency:{idempotent.IdempotencyKey}";

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