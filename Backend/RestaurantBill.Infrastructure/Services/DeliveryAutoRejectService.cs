using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Infrastructure.Services;

// Yanıtlanmayan online siparişleri şubenin süresi dolunca otomatik reddeder (müşteri "Restoran şu an yanıt veremedi."
// görür). C5'te süresi dolan rezervasyon ön siparişleri de aynı turda süpürülür.
public class DeliveryAutoRejectService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(30);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DeliveryAutoRejectService> _logger;

    public DeliveryAutoRejectService(IServiceScopeFactory scopeFactory, ILogger<DeliveryAutoRejectService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using PeriodicTimer timer = new(Interval);

        do
        {
            await RunAsync(stoppingToken);
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunAsync(CancellationToken cancellationToken)
    {
        try
        {
            using IServiceScope scope = _scopeFactory.CreateScope();
            IDeliveryOrderSweeper sweeper = scope.ServiceProvider.GetRequiredService<IDeliveryOrderSweeper>();
            DateTime now = DateTime.UtcNow;

            int rejected = await sweeper.AutoRejectStaleAsync(now, cancellationToken);
            if (rejected > 0)
                _logger.LogInformation("{Count} online sipariş yanıtlanmadığı için otomatik reddedildi.", rejected);

            int expired = await sweeper.ExpirePreOrdersAsync(now, cancellationToken);
            if (expired > 0)
                _logger.LogInformation("{Count} ön siparişin süresi doldu.", expired);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Online sipariş otomatik ret kontrolü sırasında hata oluştu.");
        }
    }
}
