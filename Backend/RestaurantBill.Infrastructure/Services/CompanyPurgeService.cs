using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Infrastructure.Services;

// Kapatılan hesapların 30 günlük bekleme süresi dolunca şirketi kalıcı olarak siler (CompanyPurger). Saatte bir bakar;
// açılışta da hemen bir tur atar. Yarıda kalan silme geri alınır ve sonraki turda yeniden denenir, iki kez silmek zararsızdır.
public class CompanyPurgeService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CompanyPurgeService> _logger;

    public CompanyPurgeService(IServiceScopeFactory scopeFactory, ILogger<CompanyPurgeService> logger)
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
            ICompanyPurger purger = scope.ServiceProvider.GetRequiredService<ICompanyPurger>();

            int purged = await purger.PurgeDueAsync(DateTime.UtcNow, cancellationToken);
            if (purged > 0)
                _logger.LogWarning("{Count} kapatılmış şirket kalıcı olarak silindi.", purged);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kapatılmış şirketleri silme işi sırasında hata oluştu.");
        }
    }
}
