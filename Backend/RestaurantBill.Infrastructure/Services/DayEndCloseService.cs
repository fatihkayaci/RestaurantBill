using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Infrastructure.Services;

public class DayEndCloseService : BackgroundService
{
    // Sabit 24 saatlik bir zamanlayıcı deploy saatine göre kayar. Dakikalık tik hem restart'a
    // dayanıklı hem de sunucu bir süre kapalıyken kaçan bir kapanışı bir sonraki tikte yakalar,
    // çünkü koşul "şu an tam gün sonu mu" değil "gün sonunu geçmiş mi"dir.
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DayEndCloseService> _logger;

    public DayEndCloseService(IServiceScopeFactory scopeFactory, ILogger<DayEndCloseService> logger)
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
            IAppDbContext db = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
            IShiftBalanceCalculator balanceCalculator = scope.ServiceProvider.GetRequiredService<IShiftBalanceCalculator>();

            DateTime utcNow = DateTime.UtcNow;

            List<Shift> openShifts = await db.Shifts
                .Include(s => s.Branch)
                .Include(s => s.CashRegister)
                .Where(s => s.Status == ShiftStatus.Open)
                .ToListAsync(cancellationToken);

            int closedCount = 0;
            foreach (Shift shift in openShifts)
            {
                if (!IsPastDayEnd(shift, utcNow)) continue;

                decimal expectedClosingBalance = await balanceCalculator.CalculateExpectedClosingBalanceAsync(shift, cancellationToken);
                shift.CloseWithoutCount(null, expectedClosingBalance, bySystem: true);
                closedCount++;

                AuditLog log = AuditLog.Create(
                    shift.BranchId,
                    "Sistem",
                    AuditLogCategory.System,
                    AuditLogSeverity.Info,
                    "ShiftAutoClosed",
                    $"{shift.CashRegister.Name} kasasındaki gün, şubenin gün sonu saati geldiği için otomatik kapatıldı. Beklenen: ₺{expectedClosingBalance}. Sayım bekliyor.",
                    nameof(Shift),
                    shift.Id);
                db.AuditLogs.Add(log);
            }

            if (closedCount > 0)
            {
                await db.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Gün sonu saati geldiği için {Count} vardiya otomatik kapatıldı.", closedCount);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gün sonu otomatik kapanış işi sırasında hata oluştu.");
        }
    }

    private static bool IsPastDayEnd(Shift shift, DateTime utcNow)
    {
        TimeZoneInfo timeZone;
        try
        {
            timeZone = TimeZoneInfo.FindSystemTimeZoneById(shift.Branch.TimeZoneId);
        }
        catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            timeZone = TimeZoneInfo.Utc;
        }

        DateTime openedAtUtc = DateTime.SpecifyKind(shift.OpenedAt, DateTimeKind.Utc);
        DateTime openedAtLocal = TimeZoneInfo.ConvertTimeFromUtc(openedAtUtc, timeZone);
        DateTime nowLocal = TimeZoneInfo.ConvertTimeFromUtc(utcNow, timeZone);

        // Vardiyadan sonraki ilk gün sonu saati kapanış anıdır: açılıştan önceki bir saatse
        // (örn. 14:00'te açılıp gün sonu 00:00 ise) bir sonraki takvim gününe kayar.
        DateTime dayEndLocal = DateOnly.FromDateTime(openedAtLocal).ToDateTime(shift.Branch.DayEndTime);
        if (dayEndLocal <= openedAtLocal)
            dayEndLocal = dayEndLocal.AddDays(1);

        return nowLocal >= dayEndLocal;
    }
}
