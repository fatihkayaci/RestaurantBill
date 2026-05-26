using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class Order : BaseEntity
    {
        public string Note { get; private set; } = string.Empty;
        public decimal TotalPrice { get; private set; }
        public OrderStatus Status { get; private set; } = OrderStatus.Active;
        public int TableId { get; private set; }
        public Table Table { get; private set; } = default!;

        private readonly List<OrderItem> _orderItems = new();
        public IReadOnlyCollection<OrderItem> OrderItems => _orderItems.AsReadOnly();

        protected Order() { }

        public static Order Create(int tableId)
        {
            if (tableId <= 0)
                throw new DomainException("Geçersiz masa ID'si.");

            return new Order
            {
                TableId = tableId,
                Status = OrderStatus.Active
            };
        }

        public void AddItem(Product product, int quantity)
        {
            if (quantity <= 0)
                throw new DomainException("Miktar 0'dan büyük olmalı.");

            OrderItem? existing = _orderItems.FirstOrDefault(x => x.ProductId == product.Id && x.Status == OrderItemStatus.Pending);

            if (existing != null)
            {
                existing.AddQuantity(quantity);
                existing.Product = product;
            }
            else
            {
                _orderItems.Add(OrderItem.Create(product.Id, product.Price, quantity, product));
            }

            RecalculateTotal();

            if (Status < OrderStatus.Preparing)
                Status = OrderStatus.Pending;
        }

        public void RemoveItem(int productId)
        {
            OrderItem? item = _orderItems.FirstOrDefault(x => x.ProductId == productId);
            if (item == null)
                throw new DomainException("İptal etmek istediğiniz ürün zaten bu siparişte yok.");

            _orderItems.Remove(item);
            RecalculateTotal();
        }

        public void UpdateItemQuantity(int productId, int quantity)
        {
            OrderItem? item = _orderItems.FirstOrDefault(x => x.ProductId == productId);
            if (item == null)
                throw new DomainException("Güncellemek istediğiniz ürün bu siparişte yok.");

            item.UpdateQuantity(quantity);
            RecalculateTotal();
        }

        public void UpdateStatus(OrderStatus newStatus)
        {
            if (!Enum.IsDefined(typeof(OrderStatus), newStatus))
                throw new DomainException("Geçersiz sipariş durumu.");

            Status = newStatus;

            var transitions = new Dictionary<OrderStatus, (OrderItemStatus from, OrderItemStatus to)>
            {
                [OrderStatus.Preparing] = (OrderItemStatus.Pending,   OrderItemStatus.Preparing),
                [OrderStatus.Ready]     = (OrderItemStatus.Preparing, OrderItemStatus.Ready),
                [OrderStatus.Served]    = (OrderItemStatus.Ready,     OrderItemStatus.Delivered),
            };

            if (transitions.TryGetValue(newStatus, out (OrderItemStatus from, OrderItemStatus to) transition))
            {
                foreach (OrderItem item in _orderItems.Where(i => i.Status == transition.from))
                    item.UpdateStatus(transition.to);
            }
        }

        public void UpdateItemStatus(int orderItemId, OrderItemStatus status)
        {
            if (!Enum.IsDefined(typeof(OrderItemStatus), status))
                throw new DomainException("Geçersiz ürün durumu.");

            OrderItem? item = _orderItems.FirstOrDefault(x => x.Id == orderItemId);
            if (item == null)
                throw new DomainException("Böyle bir sipariş kalemi bulunamadı.");

            item.UpdateStatus(status);
        }

        public void Close()
        {
            Status = OrderStatus.Paid;
        }

        public void Cancel()
        {
            Status = OrderStatus.Cancelled;
        }

        private void RecalculateTotal()
        {
            TotalPrice = _orderItems.Sum(x => x.UnitPrice * x.Quantity);
        }
    }
}
