using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RestaurantBill.Application.Common;
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

            services.Configure<BunnyStorageOptions>(configuration.GetSection(BunnyStorageOptions.SectionName));
            services.AddHttpClient<IImageStorageService, BunnyStorageService>();

            services.AddHostedService<RefreshTokenCleanupService>();
            services.AddHostedService<DayEndCloseService>();

            return services;
        }
    }
}