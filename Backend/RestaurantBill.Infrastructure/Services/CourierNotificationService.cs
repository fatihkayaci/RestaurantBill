using Microsoft.AspNetCore.SignalR;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Infrastructure.Hubs;

namespace RestaurantBill.Infrastructure.Services;

// Kurye ekranı /courier-hub'da "CourierOrdersChanged" dinler ve siparişlerini yeniden çeker.
public class CourierNotificationService(IHubContext<CourierHub> hubContext) : ICourierNotificationService
{
    public Task SendCourierOrdersChangedAsync(Guid restaurantId, Guid courierUserId, Guid? deliveryOrderId = null)
        => hubContext.Clients.Groups(HubGroups.CourierOrdersChangedTargets(restaurantId, courierUserId))
            .SendAsync("CourierOrdersChanged", new CourierOrdersChangedDto { CourierUserId = courierUserId, DeliveryOrderId = deliveryOrderId });
}
