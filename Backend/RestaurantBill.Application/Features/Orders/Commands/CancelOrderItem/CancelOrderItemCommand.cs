using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.CancelOrderItem
{
    /// <summary>
    /// Siparişteki tek satırın (ürün ya da menü) verilen adedini iptal eder: 3 ayrandan 1'i ya da satırın tamamı.
    /// Siparişin tamamını iptal etmekle aynı yetkiye bağlıdır.
    /// </summary>
    public class CancelOrderItemCommand : IRequest<Result>, IIdempotent
    {
        public Guid OrderId { get; set; }
        public Guid OrderItemId { get; set; }
        /// <summary>İptal edilecek adet (1..satırdaki adet); satırdaki adede eşitse satır çıkar.</summary>
        public int Quantity { get; set; }
        /// <summary>İsteğe bağlı iptal nedeni ("Müşteri vazgeçti"); işlem kaydına yazılır.</summary>
        public string? Reason { get; set; }

        public string IdempotencyKey => $"cancel-order-item:{OrderId}:{OrderItemId}";
    }
}
