using MediatR;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace RestaurantBill.Application.Behaviors;

public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var timer = new Stopwatch();
        timer.Start();

        var requestName = typeof(TRequest).Name;

        _logger.LogInformation("[BAŞLADI] İçeri alınan komut: {RequestName}", requestName);

        var response = await next();

        timer.Stop();

        _logger.LogInformation("[BİTTİ] Başarıyla tamamlanan komut: {RequestName} - Süre: {ElapsedMilliseconds} ms", requestName, timer.ElapsedMilliseconds);

        return response;
    }
}