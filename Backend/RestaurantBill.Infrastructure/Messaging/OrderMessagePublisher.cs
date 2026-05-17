using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Infrastructure.Messaging.Models;

namespace RestaurantBill.Infrastructure.Messaging
{
    public class OrderMessagePublisher : IOrderMessagePublisher, IAsyncDisposable
    {
        private readonly IConnection _connection;
        private readonly IChannel _channel;
        private const string QueueName = "kitchen.orders";

        public OrderMessagePublisher(IConnection connection, IChannel channel)
        {
            _connection = connection;
            _channel = channel;
        }

        public static async Task<OrderMessagePublisher> CreateAsync(IConnectionFactory factory)
        {
            IConnection connection = await factory.CreateConnectionAsync();
            IChannel channel = await connection.CreateChannelAsync();

            await channel.QueueDeclareAsync(
                queue: QueueName,
                durable: true,
                exclusive: false,
                autoDelete: false);

            return new OrderMessagePublisher(connection, channel);
        }

        public async Task PublishOrderCreatedAsync(Order order, CancellationToken cancellationToken = default)
        {
            KitchenOrderMessage message = new KitchenOrderMessage
            {
                Id = order.Id,
                TableId = order.TableId,
                Note = order.Note,
                TotalPrice = order.TotalPrice,
                Status = (int)order.Status,
                OrderItems = order.OrderItems.Select(i => new KitchenOrderItemMessage
                {
                    Id = i.Id,
                    ProductId = i.ProductId,
                    ProductName = i.Product?.Name ?? string.Empty,
                    UnitPrice = i.UnitPrice,
                    Quantity = i.Quantity,
                    Status = (int)i.Status
                }).ToList()
            };

            string json = JsonSerializer.Serialize(message);
            byte[] body = Encoding.UTF8.GetBytes(json);

            BasicProperties properties = new BasicProperties
            {
                Persistent = true
            };

            await _channel.BasicPublishAsync(
                exchange: string.Empty,
                routingKey: QueueName,
                mandatory: false,
                basicProperties: properties,
                body: body,
                cancellationToken: cancellationToken);
        }

        public async ValueTask DisposeAsync()
        {
            await _channel.DisposeAsync();
            await _connection.DisposeAsync();
        }
    }
}
