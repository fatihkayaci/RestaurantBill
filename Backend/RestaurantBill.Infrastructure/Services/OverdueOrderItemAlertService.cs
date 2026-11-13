using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Infrastructure.Services;

// Hazırlanma süresini aşan kalemleri periyodik olarak bulur ve şube yöneticilerinin paneline
// canlı uyarı yollar. Kalıcı bildirim kutusu yok: panel o an açık değilse uyarı kaçırılır,
// ama "Geciken siparişler" kartı aynı listeyi her zaman gösterir.
public class OverdueOrderItemAlertService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(30);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OverdueOrderItemAlertService> _logger;

    public OverdueOrderItemAlertService(IServiceScopeFactory scopeFactory, ILogger<OverdueOrderItemAlertService> logger)
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
            IOverdueOrderItemNotifier notifier = scope.ServiceProvider.GetRequiredService<IOverdueOrderItemNotifier>();

            int count = await notifier.NotifyNewlyOverdueAsync(DateTime.UtcNow, cancellationToken);
            if (count > 0)
                _logger.LogInformation("{Count} sipariş kalemi hazırlanma süresini aştı; yöneticilere bildirildi.", count);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Geciken sipariş kontrolü sırasında hata oluştu.");
        }
    }
}
