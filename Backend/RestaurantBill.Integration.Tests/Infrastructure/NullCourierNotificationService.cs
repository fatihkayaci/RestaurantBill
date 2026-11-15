using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Integration.Tests.Infrastructure;

public class NullCourierNotificationService : ICourierNotificationService
{
    public Task SendCourierOrdersChangedAsync(Guid restaurantId, Guid courierUserId, Guid? deliveryOrderId = null) => Task.CompletedTask;
}
