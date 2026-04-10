using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using RestaurantBill.Infrastructure.Messaging.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace RestaurantBill.Infrastructure.Messaging
{
    public class KitchenOrderConsumer : BackgroundService
    {
        private readonly IConnectionFactory _factory;
        private readonly ILogger<KitchenOrderConsumer> _logger;
        private const string QueueName = "kitchen.orders";

        private IConnection? _connection;
        private IChannel? _channel;

        public KitchenOrderConsumer(IConnectionFactory factory, ILogger<KitchenOrderConsumer> logger)
        {
            _factory = factory;
            _logger = logger;
        }

        public override async Task StartAsync(CancellationToken cancellationToken)
        {
            _connection = await _factory.CreateConnectionAsync(cancellationToken);
            _channel = await _connection.CreateChannelAsync(cancellationToken: cancellationToken);

            await _channel.QueueDeclareAsync(
                queue: QueueName,
                durable: true,
                exclusive: false,
                autoDelete: false,
                cancellationToken: cancellationToken);

            await base.StartAsync(cancellationToken);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            AsyncEventingBasicConsumer consumer = new AsyncEventingBasicConsumer(_channel!);

            consumer.ReceivedAsync += async (sender, args) =>
            {
                string json = Encoding.UTF8.GetString(args.Body.ToArray());
                KitchenOrderMessage? message = JsonSerializer.Deserialize<KitchenOrderMessage>(json);

                if (message is not null)
                {
                    _logger.LogInformation(
                        "Kitchen received order. OrderId: {OrderId}, TableId: {TableId}, At: {CreatedAt}",
                        message.OrderId, message.TableId, message.CreatedAt);

                    // TODO: notify kitchen via SignalR or update DB status
                }

                await _channel!.BasicAckAsync(args.DeliveryTag, multiple: false);
            };

            await _channel!.BasicConsumeAsync(
                queue: QueueName,
                autoAck: false,
                consumer: consumer,
                cancellationToken: stoppingToken);

            await Task.Delay(Timeout.Infinite, stoppingToken);
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            await base.StopAsync(cancellationToken);

            if (_channel is not null) await _channel.DisposeAsync();
            if (_connection is not null) await _connection.DisposeAsync();
        }
    }
}