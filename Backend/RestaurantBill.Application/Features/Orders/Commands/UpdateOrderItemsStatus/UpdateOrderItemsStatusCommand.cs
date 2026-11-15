using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemsStatus;

// Bir siparişin seçili kalemlerini tek istekte aynı duruma taşır (mutfakta "Pasaya gönder", "Alındı", "Geri al").
// Ürün ürün istek atmak yerine bunu kullanmak, garsona tek "ürün hazır" bildirimi gitmesini sağlar.
public class UpdateOrderItemsStatusCommand : IRequest<Result>
{
    public Guid OrderId { get; set; }
    public List<Guid> OrderItemIds { get; set; } = [];
    public int Status { get; set; }
}
