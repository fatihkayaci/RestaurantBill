using RabbitMQ.Client;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Infrastructure.MessageBrokers;

public class RabbitMqProducer : IMessageProducer
{
    private readonly IConfiguration _configuration;

    public RabbitMqProducer(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task SendMessageAsync<T>(T message, string queueName)
    {
        var factory = new ConnectionFactory
        {
            HostName = _configuration["RabbitMQ:Host"] ?? "localhost",
            UserName = _configuration["RabbitMQ:Username"] ?? "guest", 
            Password = _configuration["RabbitMQ:Password"] ?? "guest"
        };

        // Geri kalan her şey senin yazdığın gibi, yeni V7 asenkron metotlar!
        await using var connection = await factory.CreateConnectionAsync();
        await using var channel = await connection.CreateChannelAsync(); 

        await channel.QueueDeclareAsync(queue: queueName,
                                        durable: true,
                                        exclusive: false,
                                        autoDelete: false,
                                        arguments: null);

        var jsonString = JsonSerializer.Serialize(message);
        var body = Encoding.UTF8.GetBytes(jsonString);

        await channel.BasicPublishAsync(exchange: string.Empty,
                                        routingKey: queueName,
                                        body: body);
    }
}