using System.Diagnostics;
using MediatR;
using Microsoft.Extensions.Logging;

namespace RestaurantBill.Application.Behaviors;
public class PerformanceBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<PerformanceBehavior<TRequest, TResponse>> _logger;
    private const int SlowRequestThresholdMs = 500;
    
    public PerformanceBehavior(ILogger<PerformanceBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(TRequest request, 
        RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var timer = Stopwatch.StartNew();
        var response = await next();
        timer.Stop();

        if (timer.ElapsedMilliseconds > SlowRequestThresholdMs)
            _logger.LogWarning("SLOW QUERY [{Handler}] {ElapsedMs}ms | Request: {@Request}",
                typeof(TRequest).Name, timer.ElapsedMilliseconds, request);

        return response;
    }
}
