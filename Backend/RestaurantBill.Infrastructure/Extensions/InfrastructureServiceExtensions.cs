using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RabbitMQ.Client;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Infrastructure.Messaging;
using RestaurantBill.Infrastructure.Services;

namespace RestaurantBill.Infrastructure.Extensions
{
    public static class InfrastructureServiceExtensions
    {
        public static IServiceCollection AddInfrastructureServices(this IServiceCollection services)
        {
            services.AddScoped<ITableNotificationService, TableNotificationService>();
            return services;
        }

        public static async Task AddRabbitMQAsync(this IServiceCollection services, IConfiguration configuration)
        {
            ConnectionFactory factory = new()
            {
                HostName = configuration["RabbitMQ:Host"] ?? "localhost",
                UserName = configuration["RabbitMQ:Username"] ?? "guest",
                Password = configuration["RabbitMQ:Password"] ?? "guest"
            };

            services.AddSingleton<IConnectionFactory>(factory);
            
            services.AddSingleton<IOrderMessagePublisher>(
                await OrderMessagePublisher.CreateAsync(factory));
            services.AddHostedService<KitchenOrderConsumer>();
        }
    }
}