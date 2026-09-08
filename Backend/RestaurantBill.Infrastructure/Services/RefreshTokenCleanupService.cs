using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Infrastructure.Services;

public class RefreshTokenCleanupService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RefreshTokenCleanupService> _logger;
    private readonly int _retentionDays;

    public RefreshTokenCleanupService(IServiceScopeFactory scopeFactory, ILogger<RefreshTokenCleanupService> logger, IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _retentionDays = configuration.GetValue<int?>("RefreshTokenSettings:CleanupRetentionDays") ?? 30;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using PeriodicTimer timer = new(Interval);

        do
        {
            await CleanupAsync(stoppingToken);
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task CleanupAsync(CancellationToken cancellationToken)
    {
        try
        {
            using IServiceScope scope = _scopeFactory.CreateScope();
            IAppDbContext db = scope.ServiceProvider.GetRequiredService<IAppDbContext>();

            // Süresi zaten geçmiş token'lar (revoke edilmiş olsun olmasın) artık hiçbir işe yaramaz;
            // reuse-detection zincir takibi yalnızca henüz süresi dolmamış token'lar için anlamlıdır.
            DateTime cutoff = DateTime.UtcNow.AddDays(-_retentionDays);

            int deleted = await db.RefreshTokens
                .Where(rt => rt.ExpiresAt < cutoff)
                .ExecuteDeleteAsync(cancellationToken);

            if (deleted > 0)
                _logger.LogInformation("Süresi geçmiş {Count} refresh token temizlendi.", deleted);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Refresh token temizleme işi sırasında hata oluştu.");
        }
    }
}
