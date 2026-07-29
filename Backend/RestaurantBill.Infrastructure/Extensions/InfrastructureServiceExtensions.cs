using Microsoft.Extensions.DependencyInjection;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Infrastructure.Services;

namespace RestaurantBill.Infrastructure.Extensions
{
    public static class InfrastructureServiceExtensions
    {
        public static IServiceCollection AddInfrastructureServices(this IServiceCollection services)
        {
            services.AddScoped<ITableNotificationService, TableNotificationService>();
            services.AddScoped<ICashierNotificationService, CashierNotificationService>();
            services.AddScoped<ISmsSender, SmsSender>();
            services.AddScoped<IEmailSender, EmailSender>();
            return services;
        }
    }
}