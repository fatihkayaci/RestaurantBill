using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.RequestBill;

// Garson masanın hesabını kasaya bildirir (Cancel = true: yanlışlıkla verilen isteği geri alır).
public class RequestBillCommand : IRequest<Result>
{
    public Guid OrderId { get; set; }
    public bool Cancel { get; set; }
}
