using System.Collections.Concurrent;
using MediatR;
using Microsoft.Extensions.Logging;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Application.Behaviors;
public class IdempotencyBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<IdempotencyBehavior<TRequest, TResponse>> _logger;
    private readonly ICurrentUserService _currentUser;

    public IdempotencyBehavior(ILogger<IdempotencyBehavior<TRequest, TResponse>> logger, ICurrentUserService currentUser)
    {
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

        var key = $"idempotency:r{_currentUser.BranchId}:{idempotent.IdempotencyKey}";

        // TryAdd atomiktir: aynı anda gelen iki çift tıklamadan yalnızca biri kilidi alır.
        if (!IdempotencyLocks.InFlight.TryAdd(key, 0))
        {
            _logger.LogWarning("Duplicate request blocked: {Key}", key);
            throw new BusinessException("İşleminiz gerçekleştiriliyor, lütfen birkaç saniye bekleyip tekrar deneyin.");
        }

        try
        {
            return await next();
        }
        finally
        {
            IdempotencyLocks.InFlight.TryRemove(key, out _);
        }
    }
}

// Generic sınıftaki static alan her TRequest için ayrı olurdu; kilit tablosu tüm istek tipleri arasında ortak.
internal static class IdempotencyLocks
{
    public static readonly ConcurrentDictionary<string, byte> InFlight = new();
}
