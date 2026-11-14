using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Delivery.Staff;
using RestaurantBill.Application.Features.Orders.Overdue;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Infrastructure.Services;

namespace RestaurantBill.Infrastructure.Extensions
{
    public static class InfrastructureServiceExtensions
    {
        public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddScoped<ITableNotificationService, TableNotificationService>();
            services.AddScoped<ICashierNotificationService, CashierNotificationService>();
            services.AddScoped<ISmsSender, SmsSender>();
            services.AddScoped<IEmailSender, EmailSender>();
            services.AddScoped<IShiftBalanceCalculator, ShiftBalanceCalculator>();
            services.AddScoped<IBusinessDayResolver, BusinessDayResolver>();
            services.AddScoped<IReportScopeResolver, ReportScopeResolver>();
            services.AddScoped<IOverdueOrderItemNotifier, OverdueOrderItemNotifier>();
            services.AddScoped<IKitchenNotificationService, KitchenNotificationService>();
            services.AddScoped<ICourierNotificationService, CourierNotificationService>();
            services.AddScoped<IOrderPricingService, OrderPricingService>();
            services.AddScoped<IDeliveryOrderSweeper, DeliveryOrderSweeper>();

            // Masa QR'ı "Garson çağır" / "Hesap iste" bekleme süresi bellekte tutulur; tüm istekler aynı örneği görmeli.
            services.TryAddSingleton(TimeProvider.System);
            services.AddSingleton<TableActionCooldown>();
            // "Rezervasyon sorgula" kod başına hatalı deneme sayacı da bellekte ve tek örnek.
            services.AddSingleton<ReservationLookupGuard>();

            services.Configure<BunnyStorageOptions>(configuration.GetSection(BunnyStorageOptions.SectionName));
            services.AddHttpClient<IImageStorageService, BunnyStorageService>();

            services.AddHostedService<RefreshTokenCleanupService>();
            services.AddHostedService<DayEndCloseService>();
            services.AddHostedService<OverdueOrderItemAlertService>();
            services.AddHostedService<DeliveryAutoRejectService>();

            return services;
        }
    }
}