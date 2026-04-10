namespace RestaurantBill.Application.Interfaces
{
    public interface IOrderMessagePublisher
    {
        Task PublishOrderCreatedAsync(int orderId, int tableId, CancellationToken cancellationToken = default);
    }
}