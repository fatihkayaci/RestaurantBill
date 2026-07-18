using MediatR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Application.Behaviors;
public class IdempotencyBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<IdempotencyBehavior<TRequest, TResponse>> _logger;
    private readonly ICurrentUserService _currentUser;
    private static readonly TimeSpan LockSafetyNet = TimeSpan.FromSeconds(30);

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
            throw new BusinessException("İşleminiz gerçekleştiriliyor, lütfen birkaç saniye bekleyip tekrar deneyin.");
        }

        _cache.Set(key, true, LockSafetyNet);

        try
        {
            return await next();
        }
        finally
        {
            _cache.Remove(key);
        }
    }
}