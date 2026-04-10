using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Interfaces
{
    public interface IOrderMessagePublisher
    {
        Task PublishOrderCreatedAsync(Order order, CancellationToken cancellationToken = default);
    }
}