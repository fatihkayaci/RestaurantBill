namespace RestaurantBill.Application.Interfaces;

public interface IMessageProducer
{
    Task SendMessageAsync<T>(T message, string queueName);
}